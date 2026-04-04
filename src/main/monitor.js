const activeWin = require('active-win');
const schedule = require('node-schedule');
const { exec } = require('child_process');
const path = require('path');
const { BrowserWindow } = require('electron');
const { getStore } = require('./store');
const { showOverlay, hideOverlay, updateOverlay } = require('./overlay');

let monitorTimeout = null;
let currentBlockedApp = null;
let lastBlockedWindowTitle = '';
let lastBlockedExeName = '';
let warningCount = 0;
let lastWarningTime = 0;
let blockedAppHistory = {};
let appWarningCounts = {};  // Persistent warning counts per app
let midnightCheckJob = null;
let shutdownInterval = null;  // Shutdown countdown interval
let countdownInterval = null;  // Final warning countdown interval
let lastLoggedTitle = '';
let lastLoggedState = '';

// Check for environment variable override (for development)
// Use function to ensure it's evaluated at runtime, not module load time
function isDryRunMode() {
    return process.env.DRY_RUN === 'true';
}

// Pure time-window check — exported for unit testing
function isTimeInWindow(start, end, currentMins) {
    if (!start || !end) return false;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const sMins = sh * 60 + sm;
    const eMins = eh * 60 + em;
    if (sMins <= eMins) return currentMins >= sMins && currentMins < eMins;
    else return currentMins >= sMins || currentMins < eMins;
}

// Resets all module-level state — used in tests to isolate each case
function resetState() {
    if (monitorTimeout) clearTimeout(monitorTimeout);
    if (countdownInterval) clearInterval(countdownInterval);
    if (shutdownInterval) clearInterval(shutdownInterval);
    monitorTimeout = null;
    currentBlockedApp = null;
    lastBlockedWindowTitle = '';
    lastBlockedExeName = '';
    warningCount = 0;
    lastWarningTime = 0;
    blockedAppHistory = {};
    appWarningCounts = {};
    countdownInterval = null;
    shutdownInterval = null;
    lastLoggedTitle = '';
    lastLoggedState = '';
}

function addLog(message, type = 'info') {
    const log = {
        message,
        type,
        timestamp: Date.now()
    };

    // Send to all renderer windows (Dashboard)
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('log-update', log);
    });
}

function setupMonitor() {
    const config = getStore();

    refreshScheduler(config);

    if (config.activeMonitoring && config.activeMonitoring.enabled) {
        monitorLoop();
        addLog('✨ Monitoring service started', 'info');
    }
}

function stopMonitor() {
    if (monitorTimeout) {
        clearTimeout(monitorTimeout);
        monitorTimeout = null;
    }
    if (midnightCheckJob) {
        midnightCheckJob.cancel();
        midnightCheckJob = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (shutdownInterval) {
        clearInterval(shutdownInterval);
        shutdownInterval = null;
    }
}

async function monitorLoop() {
    const config = getStore(); // Always get fresh config

    await checkActiveWindow(config);

    if (config.activeMonitoring && config.activeMonitoring.enabled) {
        monitorTimeout = setTimeout(monitorLoop, (config.activeMonitoring?.checkIntervalSeconds || 2) * 1000);
    }
}

async function checkActiveWindow(config) {
    try {
        const window = await activeWin();
        if (!window) return;

        // --- 1. Check if we are in Active Window ---
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const inActiveWindow = config.activeMonitoring?.enabled &&
            isTimeInWindow(config.activeMonitoring.startTime, config.activeMonitoring.endTime, currentMins);

        if (!inActiveWindow) {
            if (lastLoggedState !== 'outside-window') {
                hideOverlay();
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                currentBlockedApp = null;
                lastLoggedState = 'outside-window';
            }
            return;
        }

        const processName = window.owner.name.toLowerCase();
        const windowTitle = window.title.toLowerCase();
        // Use the actual executable name (from path) for taskkill — owner.name can be a display name
        const exeName = path.basename(window.owner.path || '').toLowerCase() || processName;

        // --- 1.5. Self-Protection: Ignore Own Windows ---
        // If the active window is the Guardian itself (Overlay, Dashboard), ignore it.
        // This prevents the "Unrestricted App" reset when interacting with the overlay.
        // However, if a blocked app already has an active warning sequence, continue it
        // based on elapsed time so the overlay stealing focus doesn't stall enforcement.
        if (processName.includes('electron') || processName.includes('midnight-guardian')) {
            if (currentBlockedApp) {
                handleBlockedApp(currentBlockedApp, lastBlockedWindowTitle, 'Previously blocked', config, lastBlockedExeName);
            }
            return;
        }

        // --- 2. Whitelist Check (Global override) ---
        const isWhitelisted = config.whitelist?.domains?.some(d => windowTitle.includes(d.toLowerCase())) ||
            config.whitelist?.processes?.some(p => processName.includes(p.toLowerCase()));

        if (isWhitelisted) {
            if (currentBlockedApp) {
                addLog(`✅ Allowed: ${window.title}`, 'success');
                hideOverlay();
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                currentBlockedApp = null;
            }
            return;
        }

        // --- 2.5. Allow Keywords Check (Override block keywords) ---
        const hasAllowKeyword = config.allowKeywords?.some(k => windowTitle.includes(k.toLowerCase()));

        if (hasAllowKeyword) {
            if (currentBlockedApp) {
                addLog(`✅ Allowed by keyword: ${window.title}`, 'success');
                hideOverlay();
                currentBlockedApp = null;
            }
            return;
        }

        // --- 3. Enforcement Logic ---
        let shouldBlock = false;
        let blockReason = '';

        // Active Mode Enforcement
        if (inActiveWindow) {
            const isBlocklisted = config.blocklist?.processes?.some(p => processName.includes(p.toLowerCase())) ||
                config.blocklist?.domains?.some(d => windowTitle.includes(d.toLowerCase()));
            const matchedKeyword = config.blockKeywords?.find(k => windowTitle.includes(k.toLowerCase()));

            if (isBlocklisted) {
                shouldBlock = true;
                blockReason = 'Blocklisted App';
            } else if (matchedKeyword) {
                shouldBlock = true;
                blockReason = `Keyword "${matchedKeyword}"`;
            }
        }

        if (shouldBlock) {
            lastBlockedWindowTitle = window.title;
            lastBlockedExeName = exeName;
            handleBlockedApp(processName, window.title, blockReason, config, exeName);
        } else if (currentBlockedApp) {
            addLog(`✅ Unrestricted App`, 'info');
            hideOverlay();
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            currentBlockedApp = null;
        }

    } catch (err) {
        console.error(err);
    }
}



function handleBlockedApp(processName, windowTitle, reason, config, exeName = processName) {
    const now = Date.now();
    const maxWarnings = config.activeMonitoring.autoCloseAfterWarnings;

    // STRICT MODE: Skip all warnings and close immediately
    if (config.strictMode) {
        addLog(`🔒 [STRICT] Blocking ${processName}: ${reason}`, 'warning');

        // Immediate force close
        if (isDryRunMode() || config.dryRun) {
            addLog(`[DRY RUN] Would immediately close ${processName}`, 'success');
        } else {
            addLog(`🔨 Force closing ${processName} (Strict Mode)`, 'warning');
            exec(`taskkill /IM "${exeName}" /F`);
        }

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        currentBlockedApp = null;
        return;
    }

    // NORMAL MODE: Progressive warnings
    // Normalize key
    const appKey = processName;

    if (currentBlockedApp !== processName) {
        // New block session for this app
        currentBlockedApp = processName;

        // Retrieve internal count, default to 0 if new (or start at 1 if not previously tracked)
        if (!appWarningCounts[appKey]) appWarningCounts[appKey] = 0;

        // Increment immediately on new detection
        appWarningCounts[appKey]++;

        const currentCount = appWarningCounts[appKey];
        lastWarningTime = now;

        if (currentCount >= maxWarnings) {
            // Final warning / Force close logic
            triggerFinalWarning(processName, config, exeName);
        } else {
            // Standard Warning
            addLog(`🚫 Blocked ${processName} (${reason}) - Warning ${currentCount}/${maxWarnings}`, 'warning');
            showOverlay('Restricted App Detected', `${processName} is blocked.\nReason: ${reason}\n\nPlease close this application.`);
        }
    } else {
        // Existing block, check time for next warning
        const timeSince = (now - lastWarningTime) / 1000;
        if (timeSince >= config.activeMonitoring.warningIntervalSeconds) {
            appWarningCounts[appKey]++;
            lastWarningTime = now;
            const currentCount = appWarningCounts[appKey];

            if (currentCount >= maxWarnings) {
                triggerFinalWarning(processName, config, exeName);
            } else {
                addLog(`⚠️ ${processName} - Warning ${currentCount}/${maxWarnings}`, 'warning');
                showOverlay('Restricted App Detected', `${processName} is blocked.\nWarning ${currentCount}/${maxWarnings}`);
            }
        }
    }
}

function triggerFinalWarning(processName, config, exeName = processName) {
    addLog(`🚨 FINAL WARNING: ${processName} will be closed`, 'warning');
    showOverlay('FINAL WARNING', `Closing ${processName} in 10 seconds!`, true);

    // Clear any existing countdown to prevent multiple intervals
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    let remaining = 10;
    countdownInterval = setInterval(() => {
        remaining--;
        updateOverlay('FINAL WARNING', `Closing ${processName} in ${remaining}s...`);
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            // Check environment variable OR config setting
            if (isDryRunMode() || config.dryRun) {
                addLog(`[DRY RUN] Would close ${processName}`, 'success');
                hideOverlay();
            } else {
                addLog(`🔨 Force closing ${processName}`, 'warning');
                exec(`taskkill /IM "${exeName}" /F`);
                hideOverlay();
            }
            currentBlockedApp = null;
            // Reset count after punishment
            appWarningCounts[processName] = 0;
        }
    }, 1000);
}

function refreshScheduler(config) {
    try {
        if (midnightCheckJob) midnightCheckJob.cancel();

        // Helper to validate time
        const isValidTime = (t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t);

        // Schedule Shutdown at End Time if enabled
        if (config.activeMonitoring?.enabled && config.activeMonitoring?.shutdownAtEnd) {
            if (isValidTime(config.activeMonitoring.endTime)) {
                const [h, m] = config.activeMonitoring.endTime.split(':').map(Number);
                midnightCheckJob = schedule.scheduleJob({ hour: h, minute: m }, () => {
                    initiateShutdownSequence(config, 'Focus Session Ended');
                });
                addLog(`📅 Scheduled shutdown for ${config.activeMonitoring.endTime}`, 'info');
            } else {
                console.error('Invalid Active End Time:', config.activeMonitoring.endTime);
            }
        }

        // New: Schedule Daily Shutdown
        if (config.scheduledShutdown?.enabled && config.scheduledShutdown?.time) {
            if (isValidTime(config.scheduledShutdown.time)) {
                const [h, m] = config.scheduledShutdown.time.split(':').map(Number);

                const job = schedule.scheduleJob({ hour: h, minute: m }, () => {
                    initiateShutdownSequence(config, 'Daily Scheduled Shutdown');
                });

                if (global.scheduledShutdownJob) global.scheduledShutdownJob.cancel();
                global.scheduledShutdownJob = job;

                addLog(`📅 Daily Shutdown scheduled for ${config.scheduledShutdown.time}`, 'info');
            } else {
                console.error('Invalid Scheduled Shutdown Time:', config.scheduledShutdown.time);
            }
        } else {
            if (global.scheduledShutdownJob) global.scheduledShutdownJob.cancel();
        }
    } catch (err) {
        console.error('Scheduler Error:', err);
    }
}



function initiateShutdownSequence(config, reason) {
    addLog(`🌙 ${reason}. Initiating Shutdown.`, 'warning');

    // 60s Shutdown Countdown
    let secondsLeft = 60;

    // Force show overlay in timer mode
    updateOverlay(reason, '', {
        mode: 'timer-only',
        timerSeconds: secondsLeft,
        forceShow: true
    });

    if (shutdownInterval) clearInterval(shutdownInterval);

    shutdownInterval = setInterval(() => {
        secondsLeft--;
        // Keep updating
        updateOverlay(reason, '', {
            mode: 'timer-only',
            timerSeconds: secondsLeft
        });

        if (secondsLeft <= 0) {
            clearInterval(shutdownInterval);
            addLog('💤 Executing System Shutdown', 'warning');
            // Check environment variable OR config setting
            if (!isDryRunMode() && !config.dryRun) {
                exec('shutdown /s /t 0');
            } else {
                addLog('[DRY RUN] Shutdown command skipped', 'success');
                hideOverlay();
            }
        }
    }, 1000);
}

module.exports = {
    setupMonitor,
    stopMonitor,
    // Exported for unit testing
    isTimeInWindow,
    checkActiveWindow,
    handleBlockedApp,
    triggerFinalWarning,
    refreshScheduler,
    initiateShutdownSequence,
    resetState,
    isDryRunMode,
};
