const activeWin = require('active-win');
const schedule = require('node-schedule');
const { exec } = require('child_process');
const path = require('path');
const { BrowserWindow } = require('electron');
const { getStore } = require('./store');
const { showOverlay, hideOverlay, updateOverlay } = require('./overlay');

let monitorTimeout = null;
let currentBlockedApp = null;
let warningCount = 0;
let lastWarningTime = 0;
let blockedAppHistory = {};
let midnightCheckJob = null;
let lastLoggedTitle = '';
let lastLoggedState = '';

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
    console.log('Starting monitor...');
    const config = getStore();

    refreshScheduler(config);

    if (config.activeMonitoring && config.activeMonitoring.enabled) {
        monitorLoop();
        addLog('✨ Active monitoring enabled', 'info');
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
}

async function monitorLoop() {
    const config = getStore(); // Always get fresh config

    await checkActiveWindow(config);

    if (config.activeMonitoring && config.activeMonitoring.enabled) {
        monitorTimeout = setTimeout(monitorLoop, config.activeMonitoring.checkIntervalSeconds * 1000);
    }
}

async function checkActiveWindow(config) {
    // ... Port logic from index.js monitorActiveWindow ...
    // Simplified for brevity, need to copy the core logic carefully

    try {
        const window = await activeWin();
        if (!window) return;

        // Time Check Logic
        let startTime, endTime;
        if (config.activeMonitoring.useMidnightCheckTime && config.midnightCheck.enabled) {
            startTime = config.midnightCheck.startTime;
            endTime = config.midnightCheck.endTime;
        } else {
            startTime = config.activeMonitoring.startTime;
            endTime = config.activeMonitoring.endTime;
        }

        // Check if within window (Logic same as index.js)
        // ... Copy isWithinWindow logic ...
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        let isWithinWindow = false;
        if (startTimeInMinutes <= endTimeInMinutes) {
            isWithinWindow = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
        } else {
            isWithinWindow = currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
        }

        if (!isWithinWindow) {
            if (lastLoggedState !== 'outside-window') {
                addLog(`⏰ Outside monitoring window (${startTime} - ${endTime})`, 'info');
                lastLoggedState = 'outside-window';
                hideOverlay();
                currentBlockedApp = null;
            }
            return;
        }

        const processName = window.owner.name.toLowerCase();
        const windowTitle = window.title.toLowerCase();

        // Checking Logic
        const isWhitelisted = config.whitelist.domains.some(d => windowTitle.includes(d.toLowerCase())) ||
            config.whitelist.processes.some(p => processName.includes(p.toLowerCase()));

        if (isWhitelisted) {
            if (currentBlockedApp) {
                addLog(`✅ Switched to whitelisted app: "${window.title}"`, 'success');
                hideOverlay();
                currentBlockedApp = null;
            }
            return;
        }

        // Blocklist Logic
        const isBlocklisted = config.blocklist.processes.some(p => processName.includes(p.toLowerCase())) ||
            config.blocklist.domains.some(d => windowTitle.includes(d.toLowerCase()));
        const matchedBlockKeyword = config.blockKeywords.find(k => windowTitle.includes(k.toLowerCase()));

        if (isBlocklisted || matchedBlockKeyword) {
            const reason = isBlocklisted ? 'blocklisted' : `keyword "${matchedBlockKeyword}"`;
            handleBlockedApp(processName, window.title, reason, config);
        } else if (currentBlockedApp) {
            // App switched away from blocked app
            addLog(`✅ Switched to unrestricted app`, 'info');
            hideOverlay();
            currentBlockedApp = null;
        }

    } catch (err) {
        console.error(err);
    }
}

function handleBlockedApp(processName, windowTitle, reason, config) {
    const now = Date.now();
    const maxWarnings = config.activeMonitoring.autoCloseAfterWarnings;

    if (currentBlockedApp !== processName) {
        // New block
        warningCount = 1;
        lastWarningTime = now;
        currentBlockedApp = processName;

        addLog(`🚫 Blocked ${processName} (${reason}) - Warning 1/${maxWarnings}`, 'warning');
        showOverlay('Restricted App Detected', `${processName} is blocked.\nReason: ${reason}\n\nPlease close this application.`);
    } else {
        // Existing block, check time for next warning
        const timeSince = (now - lastWarningTime) / 1000;
        if (timeSince >= config.activeMonitoring.warningIntervalSeconds) {
            warningCount++;
            lastWarningTime = now;

            if (warningCount >= maxWarnings) {
                // Final warning / Force close
                addLog(`🚨 FINAL WARNING: ${processName} will be closed`, 'warning');
                showOverlay('FINAL WARNING', `Closing ${processName} in 10 seconds!`, true);

                // Force close countdown
                let remaining = 10;
                const countdown = setInterval(() => {
                    remaining--;
                    updateOverlay('FINAL WARNING', `Closing ${processName} in ${remaining}s...`);
                    if (remaining <= 0) {
                        clearInterval(countdown);
                        if (config.dryRun) {
                            addLog(`[DRY RUN] Would close ${processName}`, 'success');
                            hideOverlay();
                        } else {
                            addLog(`🔨 Force closing ${processName}`, 'warning');
                            exec(`taskkill /IM "${processName}.exe" /F`); // Simple taskkill
                            hideOverlay();
                        }
                        currentBlockedApp = null;
                        warningCount = 0;
                    }
                }, 1000);
            } else {
                addLog(`⚠️ ${processName} - Warning ${warningCount}/${maxWarnings}`, 'warning');
                showOverlay('Restricted App Detected', `${processName} is blocked.\nWarning ${warningCount}/${maxWarnings}`);
            }
        }
    }
}

function refreshScheduler(config) {
    if (midnightCheckJob) midnightCheckJob.cancel();

    if (config.midnightCheck.enabled) {
        const [h, m] = config.midnightCheck.endTime.split(':');
        midnightCheckJob = schedule.scheduleJob({ hour: h, minute: m }, () => {
            // Midnight logic
            addLog('🌙 Midnight Check triggered', 'warning');
            if (config.midnightCheck.enableShutdown) {
                showOverlay('Midnight Check', 'System shutdown initiated...', true);
                // ... shutdown logic ...
            }
        });
    }
}

module.exports = {
    setupMonitor,
    stopMonitor
};
