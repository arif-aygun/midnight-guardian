const schedule = require('node-schedule');
const { startServer, isMonitoringActive, addLog } = require('./server');
const activeWin = require('active-win');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const notifier = require('node-notifier');

let warningCount = 0;
let lastWarningTime = 0;
let currentBlockedApp = null;
let currentBlockedProcess = null;
let overlayProcess = null;
let lastLoggedTitle = '';
let lastLoggedState = '';
let blockedAppHistory = {};

const REG_KEYS = [
  { path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings', name: 'NOC_GLOBAL_SETTING_DO_NOT_DISTURB', operator: '-eq', expected: 1 },
  { path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings', name: 'NOC_GLOBAL_SETTING_ALLOW_NOTIFICATION_SOUND', operator: '-eq', expected: 0 },
  { path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings', name: 'NOC_GLOBAL_SETTING_TOASTS_ENABLED', operator: '-eq', expected: 0 },
  { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications', name: 'ToastEnabled', operator: '-eq', expected: 0 }
];

// Function to get fresh config
function getCurrentConfig() {
  delete require.cache[require.resolve('./config')];
  return require('./config');
}

// Reload config periodically
setInterval(() => {
  delete require.cache[require.resolve('./config')];
}, 5000);

// Start the web UI
startServer();
addLog('Midnight Guardian started', 'success');

// Check if Do Not Disturb is enabled - REPLACE with simpler version
async function isOverlayRequired() {
  return new Promise((resolve) => {
    const script = `
# Check if notifications are disabled (inverse of ToastEnabled)
$toastEnabled = Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" -Name "ToastEnabled" -ErrorAction SilentlyContinue
if ($toastEnabled -and $toastEnabled.ToastEnabled -eq 0) {
  Write-Output "enabled"
} else {
  Write-Output "disabled"
}
    `;
    
    const tempFile = path.join(os.tmpdir(), `mg-dnd-check-${Date.now()}.ps1`);
    fs.writeFileSync(tempFile, script, { encoding: 'utf8' });
    
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`, (error, stdout) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      
      const result = stdout ? stdout.trim() : '';
      const overlayNeeded = result === 'enabled';
      
      if (error) {
        resolve(false);
      } else {
        resolve(overlayNeeded);
      }
    });
  });
}

function showOverlay(title, message, keepOpen = false) {
  // If overlay is already open and we want to update it, use a file-based communication
  if (overlayProcess && keepOpen) {
    updateOverlayMessage(title, message);
    return;
  }
  
  hideOverlay();
  
  // Escape special characters for PowerShell
  const escapedTitle = title.replace(/[\r\n]/g, ' ').replace(/["'`$]/g, '');
  const escapedMessage = message.replace(/[\r\n]/g, ' ').replace(/["'`$]/g, '');
  
  const messageFile = path.join(os.tmpdir(), 'mg-overlay-message.txt');
  const closeFile = path.join(os.tmpdir(), 'mg-overlay-close.txt');
  
  fs.writeFileSync(messageFile, `${escapedTitle}|${escapedMessage}`, { encoding: 'utf8' });
  
  // Remove close signal file if it exists
  try {
    if (fs.existsSync(closeFile)) {
      fs.unlinkSync(closeFile);
    }
  } catch (e) {}
  
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$messageFile = "${messageFile.replace(/\\/g, '\\\\')}"
$closeFile = "${closeFile.replace(/\\/g, '\\\\')}"

$form = New-Object System.Windows.Forms.Form
$form.Text = "${escapedTitle}"
$form.Size = New-Object System.Drawing.Size(450, 320)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(40, 40, 40)
$form.ShowInTaskbar = $true

$iconLabel = New-Object System.Windows.Forms.Label
$iconLabel.Text = "!"
$iconLabel.Font = New-Object System.Drawing.Font("Arial", 48, [System.Drawing.FontStyle]::Bold)
$iconLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 68, 68)
$iconLabel.AutoSize = $true
$iconLabel.Location = New-Object System.Drawing.Point(190, 20)
$form.Controls.Add($iconLabel)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "${escapedTitle}"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.AutoSize = $false
$titleLabel.Size = New-Object System.Drawing.Size(410, 40)
$titleLabel.Location = New-Object System.Drawing.Point(20, 90)
$titleLabel.TextAlign = 'MiddleCenter'
$form.Controls.Add($titleLabel)

$messageLabel = New-Object System.Windows.Forms.Label
$messageLabel.Text = "${escapedMessage}"
$messageLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$messageLabel.ForeColor = [System.Drawing.Color]::LightGray
$messageLabel.AutoSize = $false
$messageLabel.Size = New-Object System.Drawing.Size(410, 100)
$messageLabel.Location = New-Object System.Drawing.Point(20, 135)
$messageLabel.TextAlign = 'MiddleCenter'
$form.Controls.Add($messageLabel)

$okButton = New-Object System.Windows.Forms.Button
$okButton.Text = "OK"
$okButton.Size = New-Object System.Drawing.Size(120, 40)
$okButton.Location = New-Object System.Drawing.Point(165, 250)
$okButton.BackColor = [System.Drawing.Color]::FromArgb(255, 68, 68)
$okButton.ForeColor = [System.Drawing.Color]::White
$okButton.FlatStyle = 'Flat'
$okButton.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$okButton.Add_Click({
  $form.Close()
})
$form.Controls.Add($okButton)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500
$timer.Add_Tick({
  if (Test-Path $closeFile) {
    $form.Close()
    return
  }
  
  if (Test-Path $messageFile) {
    try {
      $content = Get-Content $messageFile -Raw -Encoding UTF8
      $parts = $content -split '\\|', 2
      if ($parts.Length -eq 2) {
        $form.Text = $parts[0]
        $titleLabel.Text = $parts[0]
        $messageLabel.Text = $parts[1]
        $form.Refresh()
      }
    } catch {}
  }
})
$timer.Start()

$form.Add_Shown({
  $form.Activate()
  [System.Media.SystemSounds]::Hand.Play()
})

$form.Add_FormClosed({
  $timer.Stop()
  $timer.Dispose()
  if (Test-Path $messageFile) {
    Remove-Item $messageFile -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path $closeFile) {
    Remove-Item $closeFile -Force -ErrorAction SilentlyContinue
  }
})

[void]$form.ShowDialog()
$form.Dispose()
  `.trim();
  
  const tempFile = path.join(os.tmpdir(), `mg-overlay-${Date.now()}.ps1`);
  fs.writeFileSync(tempFile, script, { encoding: 'utf8' });
  
  overlayProcess = spawn('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', tempFile
  ], {
    detached: false,
    stdio: 'ignore'
  });
  
  overlayProcess.on('close', () => {
    try {
      fs.unlinkSync(tempFile);
      const msgFile = path.join(os.tmpdir(), 'mg-overlay-message.txt');
      const closeSignal = path.join(os.tmpdir(), 'mg-overlay-close.txt');
      if (fs.existsSync(msgFile)) {
        fs.unlinkSync(msgFile);
      }
      if (fs.existsSync(closeSignal)) {
        fs.unlinkSync(closeSignal);
      }
    } catch (e) {}
    overlayProcess = null;
  });
}

function updateOverlayMessage(title, message) {
  const messageFile = path.join(os.tmpdir(), 'mg-overlay-message.txt');
  const escapedTitle = title.replace(/[\r\n]/g, ' ').replace(/["'`$]/g, '');
  const escapedMessage = message.replace(/[\r\n]/g, ' ').replace(/["'`$]/g, '');
  
  try {
    fs.writeFileSync(messageFile, `${escapedTitle}|${escapedMessage}`, { encoding: 'utf8' });
  } catch (e) {
    // File might be locked, overlay will catch it on next timer tick
  }
}

function hideOverlay() {
  if (overlayProcess) {
    const closeFile = path.join(os.tmpdir(), 'mg-overlay-close.txt');
    try {
      fs.writeFileSync(closeFile, 'close', { encoding: 'utf8' });
    } catch (e) {}
    
    setTimeout(() => {
      if (overlayProcess) {
        exec(`taskkill /pid ${overlayProcess.pid} /T /F`, () => {});
        overlayProcess = null;
      }
    }, 500);
  }
  
  const messageFile = path.join(os.tmpdir(), 'mg-overlay-message.txt');
  const closeFile = path.join(os.tmpdir(), 'mg-overlay-close.txt');
  try {
    if (fs.existsSync(messageFile)) {
      fs.unlinkSync(messageFile);
    }
    if (fs.existsSync(closeFile)) {
      fs.unlinkSync(closeFile);
    }
  } catch (e) {}
}

function playSound(isUrgent = false) {
  const beepCount = isUrgent ? 5 : 2;
  
  for (let i = 0; i < beepCount; i++) {
    setTimeout(() => {
      process.stdout.write('\x07');
    }, i * 300);
  }
}

async function monitorActiveWindow() {
  const currentConfig = getCurrentConfig();
  
  if (!isMonitoringActive()) {
    return;
  }

  // CHECK: Active monitoring enabled mi?
  if (!currentConfig.activeMonitoring.enabled) {
    if (lastLoggedState !== 'disabled') {
      addLog('⏸️ Active monitoring is disabled', 'info');
      lastLoggedState = 'disabled';
      hideOverlay();
      currentBlockedApp = null;
      currentBlockedProcess = null;
      warningCount = 0;
    }
    return;
  }

  // Determine which times to use
  let startTime, endTime;
  
  if (currentConfig.activeMonitoring.useMidnightCheckTime && currentConfig.midnightCheck.enabled) {
    // Use midnight check times
    startTime = currentConfig.midnightCheck.startTime;
    endTime = currentConfig.midnightCheck.endTime;
  } else {
    // Use active monitoring's own times
    startTime = currentConfig.activeMonitoring.startTime;
    endTime = currentConfig.activeMonitoring.endTime;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  // Check if current time is within the monitoring window
  let isWithinWindow = false;
  
  if (startTimeInMinutes <= endTimeInMinutes) {
    // Normal case: start < end (e.g., 08:00 - 23:00)
    isWithinWindow = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  } else {
    // Crosses midnight (e.g., 22:00 - 02:00 OR 00:00 - 06:00)
    isWithinWindow = currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  }
  
  if (!isWithinWindow) {
    if (lastLoggedState !== 'outside-window') {
      const source = currentConfig.activeMonitoring.useMidnightCheckTime ? 'Midnight Check' : 'Active Monitoring';
      addLog(`⏰ Outside monitoring window (${startTime} - ${endTime} from ${source}) - Current time: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`, 'info');
      lastLoggedState = 'outside-window';
      
      // Hide overlay if any
      hideOverlay();
      currentBlockedApp = null;
      currentBlockedProcess = null;
      warningCount = 0;
    }
    return; // Don't monitor
  } else if (lastLoggedState === 'outside-window' || lastLoggedState === 'disabled') {
    // Reset state if we're inside the window
    const source = currentConfig.activeMonitoring.useMidnightCheckTime ? 'Midnight Check' : 'Active Monitoring';
    addLog(`✅ Inside monitoring window (${startTime} - ${endTime} from ${source}) - Current time: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`, 'info');
    lastLoggedState = '';
  }

  try {
    const window = await activeWin();
    if (!window) return;

    const processName = window.owner.name.toLowerCase();
    const processPath = window.owner.path ? window.owner.path.toLowerCase() : '';
    const windowTitle = window.title.toLowerCase();
    const executableName = processPath ? path.basename(processPath) : processName;

    const isWhitelisted = 
      currentConfig.whitelist.domains.some(d => windowTitle.includes(d.toLowerCase())) ||
      currentConfig.whitelist.processes.some(p => 
        processName.includes(p.toLowerCase()) || 
        executableName.includes(p.toLowerCase())
      );

    if (isWhitelisted) {
      if (currentBlockedApp) {
        addLog(`✅ Switched to whitelisted app: "${window.title}"`, 'success');
        hideOverlay();
        currentBlockedApp = null;
        currentBlockedProcess = null;
        warningCount = 0;
        lastLoggedState = 'whitelisted';
      } else if (lastLoggedState !== 'whitelisted' || windowTitle !== lastLoggedTitle) {
        lastLoggedTitle = windowTitle;
        lastLoggedState = 'whitelisted';
      }
      return;
    }

    const hasAllowKeyword = currentConfig.allowKeywords.some(k => 
      windowTitle.includes(k.toLowerCase())
    );

    if (hasAllowKeyword) {
      if (currentBlockedApp) {
        addLog(`✅ Switched to allowed app: "${window.title}"`, 'success');
        hideOverlay();
        currentBlockedApp = null;
        currentBlockedProcess = null;
        warningCount = 0;
        lastLoggedState = 'allowed';
      } else if (lastLoggedState !== 'allowed' || windowTitle !== lastLoggedTitle) {
        lastLoggedTitle = windowTitle;
        lastLoggedState = 'allowed';
      }
      return;
    }

    const isBlocklisted = 
      currentConfig.blocklist.processes.some(p => 
        processName.includes(p.toLowerCase()) || 
        executableName.includes(p.toLowerCase())
      ) ||
      currentConfig.blocklist.domains.some(d => 
        windowTitle.includes(d.toLowerCase())
      );

    const matchedBlockKeyword = currentConfig.blockKeywords.find(k => 
      windowTitle.includes(k.toLowerCase())
    );

    const shouldBlock = isBlocklisted || matchedBlockKeyword;

    if (shouldBlock) {
      const reason = isBlocklisted ? 'blocklisted' : `keyword "${matchedBlockKeyword}"`;
      handleBlockedApp(processName, executableName, window.title, reason, currentConfig);
    } else if (currentBlockedApp) {
      addLog(`✅ Switched to unrestricted app: "${window.title}"`, 'info');
      hideOverlay();
      currentBlockedApp = null;
      currentBlockedProcess = null;
      warningCount = 0;
      lastLoggedState = 'allowed';
    } else if (lastLoggedState !== 'neutral' || windowTitle !== lastLoggedTitle) {
      lastLoggedTitle = windowTitle;
      lastLoggedState = 'neutral';
    }
  } catch (error) {
    if (lastLoggedState !== 'error') {
      addLog(`⚠️ Monitoring error: ${error.message}`, 'error');
      lastLoggedState = 'error';
    }
  }
}

function handleBlockedApp(processName, executableName, windowTitle, reason, currentConfig) {
  const now = Date.now();
  const maxWarnings = currentConfig.activeMonitoring.autoCloseAfterWarnings;
  const displayName = processName || executableName;
  
  const appKey = `${executableName}`;
  
  if (!blockedAppHistory[appKey]) {
    blockedAppHistory[appKey] = {
      warningCount: 0,
      lastWarningTime: 0,
      firstBlockedTime: now,
      countdownActive: false
    };
  }
  
  const appHistory = blockedAppHistory[appKey];
  const wasBlocked = currentBlockedApp === displayName;
  
  const timeSinceLastWarning = (now - appHistory.lastWarningTime) / 1000;
  const shouldWarn = timeSinceLastWarning >= currentConfig.activeMonitoring.warningIntervalSeconds;
  
  currentBlockedApp = displayName;
  currentBlockedProcess = executableName;
  warningCount = appHistory.warningCount;
  lastWarningTime = appHistory.lastWarningTime;
  
  if (appHistory.warningCount === 0) {
    warningCount = 1;
    appHistory.warningCount = 1;
    appHistory.lastWarningTime = now;
    lastWarningTime = now;
    
    const message = `${displayName} is blocked!\n\nReason: ${reason}\nTitle: "${windowTitle}"\n\nWarning ${warningCount} of ${maxWarnings}`;
    addLog(`🚫 Blocked ${displayName} (${reason}) - Warning 1/${maxWarnings}`, 'warning');
    showNotificationBasedOnDND('Midnight Guardian', message);
    lastLoggedState = 'blocked';
  } else if (!wasBlocked) {
    addLog(`🔄 Returned to blocked app: ${displayName} (Warning ${warningCount}/${maxWarnings}, ${Math.round(timeSinceLastWarning)}s ago)`, 'warning');
    const message = `Still blocked: ${displayName}\n\nWarning ${warningCount} of ${maxWarnings}\n\nSwitch to another app.`;
    showNotificationBasedOnDND('Midnight Guardian', message);
    lastLoggedState = 'blocked';
  } else if (shouldWarn && !appHistory.countdownActive) {
    warningCount++;
    appHistory.warningCount = warningCount;
    appHistory.lastWarningTime = now;
    lastWarningTime = now;
    
    const isLastWarning = warningCount >= maxWarnings;
    
    if (isLastWarning) {
      appHistory.countdownActive = true;
      const countdownSeconds = 10;
      let remainingSeconds = countdownSeconds;
      
      const message = `FINAL WARNING!\n\nClose ${displayName} NOW or it will be force-closed in ${remainingSeconds} seconds!`;
      addLog(`🚨 FINAL WARNING: ${displayName} will be closed in ${countdownSeconds}s`, 'warning');
      showOverlay('FINAL WARNING', message, true);
      
      const countdownInterval = setInterval(() => {
        remainingSeconds--;
        
        if (remainingSeconds <= 0) {
          clearInterval(countdownInterval);
          addLog(`🔨 Force-closed ${displayName}`, 'warning');
          forceCloseApp(executableName);
          hideOverlay();
          
          delete blockedAppHistory[appKey];
          currentBlockedApp = null;
          currentBlockedProcess = null;
          warningCount = 0;
          lastLoggedState = 'closed';
        } else {
          const countdownMessage = `Close ${displayName} NOW!\n\n${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} remaining!`;
          updateOverlayMessage('FINAL WARNING', countdownMessage);
        }
      }, 1000);
      
      lastLoggedState = 'countdown';
    } else {
      const message = `Still using ${displayName}!\n\nWarning ${warningCount} of ${maxWarnings}\n\nSwitch to another app or it will be force-closed.`;
      addLog(`⚠️ ${displayName} - Warning ${warningCount}/${maxWarnings}`, 'warning');
      showNotificationBasedOnDND('Midnight Guardian', message);
      lastLoggedState = 'blocked';
    }
  }
}

async function showNotificationBasedOnDND(title, message) {
  const overlayNeeded = await isOverlayRequired();
  
  if (overlayNeeded) {
    addLog('Notifications disabled - showing overlay', 'info');
    showOverlay(title, message, false);
  } else {
    notifier.notify({
      title: title,
      message: message,
      icon: path.join(__dirname, 'public', 'icon.png'),
      sound: true,
      wait: false,
      timeout: 10,
      type: 'warn',
      urgency: 'normal'
    });
    
    playSound(false);
  }
}

function forceCloseApp(executableName) {
  exec(`taskkill /IM "${executableName}" /F`, (error) => {
    if (error) {
      addLog(`❌ Failed to close ${executableName}`, 'error');
      
      const nameWithoutExt = executableName.replace(/\.exe$/i, '');
      exec(`taskkill /IM "${nameWithoutExt}.exe" /F`, (error2) => {
        if (!error2) {
          addLog(`✅ Closed ${nameWithoutExt}.exe`, 'success');
        }
      });
    } else {
      addLog(`✅ Closed ${executableName}`, 'success');
    }
  });
}

function setupMidnightCheck() {
  const currentConfig = getCurrentConfig();
  
  if (currentConfig.midnightCheck.enabled) {
    const startTime = currentConfig.midnightCheck.startTime;
    const endTime = currentConfig.midnightCheck.endTime;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    addLog(`🌙 Midnight check scheduled: ${startTime} - ${endTime}`, 'info');
    
    // Schedule for end time (shutdown time)
    schedule.scheduleJob({ hour: endHour, minute: endMinute }, () => {
      addLog('🌙 Midnight check END time reached', 'info');
      
      if (currentConfig.midnightCheck.enableShutdown) {
        let countdown = currentConfig.midnightCheck.countdownSeconds;
        addLog(`⏰ System shutdown in ${countdown}s`, 'warning');
        
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            addLog('💤 Shutting down system', 'warning');
            exec('shutdown /s /t 0');
          } else if (countdown % 10 === 0 && countdown <= 30) {
            addLog(`⏰ Shutdown in ${countdown}s`, 'warning');
          }
        }, 1000);
      }
    });
  }
}

setupMidnightCheck();

const currentConfig = getCurrentConfig();
setInterval(monitorActiveWindow, currentConfig.activeMonitoring.checkIntervalSeconds * 1000);

addLog('✨ Active monitoring enabled', 'info');
console.log('Midnight Guardian is now monitoring...');