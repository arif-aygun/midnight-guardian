let config = {};
let eventSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTimePickers();
  loadConfig();
  connectLogStream();
  loadStatus();
  
  // Add event listener for checkbox
  const useMidnightCheckbox = document.getElementById('useMidnightCheckTime');
  if (useMidnightCheckbox) {
    useMidnightCheckbox.addEventListener('change', toggleActiveTimeSettings);
  }
});

// Initialize time picker dropdowns
function initializeTimePickers() {
  // Active monitoring time pickers
  const activeStartHour = document.getElementById('activeStartHour');
  const activeStartMinute = document.getElementById('activeStartMinute');
  const activeEndHour = document.getElementById('activeEndHour');
  const activeEndMinute = document.getElementById('activeEndMinute');
  
  // Midnight check time pickers
  const midnightStartHour = document.getElementById('midnightStartHour');
  const midnightStartMinute = document.getElementById('midnightStartMinute');
  const midnightEndHour = document.getElementById('midnightEndHour');
  const midnightEndMinute = document.getElementById('midnightEndMinute');
  
  // Populate hours (00-23)
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    [activeStartHour, activeEndHour, midnightStartHour, midnightEndHour].forEach(select => {
      if (select) {
        const option = document.createElement('option');
        option.value = hour;
        option.textContent = hour;
        select.appendChild(option);
      }
    });
  }
  
  // Populate minutes (00-59)
  for (let i = 0; i < 60; i++) {
    const minute = i.toString().padStart(2, '0');
    [activeStartMinute, activeEndMinute, midnightStartMinute, midnightEndMinute].forEach(select => {
      if (select) {
        const option = document.createElement('option');
        option.value = minute;
        option.textContent = minute;
        select.appendChild(option);
      }
    });
  }
  
  // Add change event listeners
  if (activeStartHour && activeStartMinute) {
    [activeStartHour, activeStartMinute].forEach(el => {
      el.addEventListener('change', () => updateTimeDisplay('activeStart'));
    });
  }
  if (activeEndHour && activeEndMinute) {
    [activeEndHour, activeEndMinute].forEach(el => {
      el.addEventListener('change', () => updateTimeDisplay('activeEnd'));
    });
  }
  if (midnightStartHour && midnightStartMinute) {
    [midnightStartHour, midnightStartMinute].forEach(el => {
      el.addEventListener('change', () => updateTimeDisplay('midnightStart'));
    });
  }
  if (midnightEndHour && midnightEndMinute) {
    [midnightEndHour, midnightEndMinute].forEach(el => {
      el.addEventListener('change', () => updateTimeDisplay('midnightEnd'));
    });
  }
}

function setTimePicker(hourId, minuteId, timeString) {
  const [hour, minute] = timeString.split(':');
  const hourEl = document.getElementById(hourId);
  const minuteEl = document.getElementById(minuteId);
  
  if (hourEl) hourEl.value = hour;
  if (minuteEl) minuteEl.value = minute;
}

function getTimePicker(hourId, minuteId) {
  const hour = document.getElementById(hourId)?.value || '00';
  const minute = document.getElementById(minuteId)?.value || '00';
  return `${hour}:${minute}`;
}

function updateTimeDisplay(type) {
  let hour, minute, displayId;
  
  if (type === 'activeStart') {
    hour = document.getElementById('activeStartHour')?.value;
    minute = document.getElementById('activeStartMinute')?.value;
    displayId = 'activeStartTimeDisplay';
  } else if (type === 'activeEnd') {
    hour = document.getElementById('activeEndHour')?.value;
    minute = document.getElementById('activeEndMinute')?.value;
    displayId = 'activeEndTimeDisplay';
  } else if (type === 'midnightStart') {
    hour = document.getElementById('midnightStartHour')?.value;
    minute = document.getElementById('midnightStartMinute')?.value;
    displayId = 'midnightStartTimeDisplay';
  } else if (type === 'midnightEnd') {
    hour = document.getElementById('midnightEndHour')?.value;
    minute = document.getElementById('midnightEndMinute')?.value;
    displayId = 'midnightEndTimeDisplay';
  }
  
  if (!hour || !minute) return;
  
  const h = parseInt(hour);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
  const timeStr = `${hour}:${minute} (${hour12}:${minute} ${period})`;
  
  const displayEl = document.getElementById(displayId);
  if (displayEl) {
    displayEl.textContent = timeStr;
  }
}

function toggleActiveTimeSettings() {
  const useMidnightTime = document.getElementById('useMidnightCheckTime')?.checked;
  const timeSettings = document.getElementById('activeTimeSettings');
  const endTimeSettings = document.getElementById('activeEndTimeSettings');
  
  if (useMidnightTime) {
    if (timeSettings) timeSettings.style.display = 'none';
    if (endTimeSettings) endTimeSettings.style.display = 'none';
  } else {
    if (timeSettings) timeSettings.style.display = 'block';
    if (endTimeSettings) endTimeSettings.style.display = 'block';
  }
}

// Load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    config = await response.json();
    
    // Active Monitoring
    const activeEnabled = document.getElementById('activeEnabled');
    const useMidnightCheckTime = document.getElementById('useMidnightCheckTime');
    const checkInterval = document.getElementById('checkInterval');
    const warningInterval = document.getElementById('warningInterval');
    const maxWarnings = document.getElementById('maxWarnings');
    
    if (activeEnabled) activeEnabled.checked = config.activeMonitoring?.enabled || false;
    if (useMidnightCheckTime) useMidnightCheckTime.checked = config.activeMonitoring?.useMidnightCheckTime || false;
    if (checkInterval) checkInterval.value = config.activeMonitoring?.checkIntervalSeconds || 7;
    if (warningInterval) warningInterval.value = config.activeMonitoring?.warningIntervalSeconds || 10;
    if (maxWarnings) maxWarnings.value = config.activeMonitoring?.autoCloseAfterWarnings || 3;
    
    setTimePicker('activeStartHour', 'activeStartMinute', config.activeMonitoring?.startTime || '00:00');
    setTimePicker('activeEndHour', 'activeEndMinute', config.activeMonitoring?.endTime || '23:59');
    
    // Midnight Check
    const midnightEnabled = document.getElementById('midnightEnabled');
    const midnightShutdown = document.getElementById('midnightShutdown');
    const midnightCountdown = document.getElementById('midnightCountdown');
    
    if (midnightEnabled) midnightEnabled.checked = config.midnightCheck?.enabled || false;
    if (midnightShutdown) midnightShutdown.checked = config.midnightCheck?.enableShutdown || false;
    if (midnightCountdown) midnightCountdown.value = config.midnightCheck?.countdownSeconds || 10;
    
    setTimePicker('midnightStartHour', 'midnightStartMinute', config.midnightCheck?.startTime || '20:00');
    setTimePicker('midnightEndHour', 'midnightEndMinute', config.midnightCheck?.endTime || '23:00');
    
    // Update displays
    updateTimeDisplay('activeStart');
    updateTimeDisplay('activeEnd');
    updateTimeDisplay('midnightStart');
    updateTimeDisplay('midnightEnd');
    
    // Toggle visibility
    toggleActiveTimeSettings();
    
    // Render all lists
    renderBlockKeywords();
    renderAllowKeywords();
    renderBlocklistProcesses();
    renderBlocklistDomains();
    renderWhitelistProcesses();
    renderWhitelistDomains();
    
  } catch (error) {
    console.error('Error loading config:', error);
    showNotification('❌ Error loading configuration', 'error');
  }
}

// Save configuration
async function saveConfig() {
  try {
    // Active Monitoring
    config.activeMonitoring.enabled = document.getElementById('activeEnabled')?.checked || false;
    config.activeMonitoring.useMidnightCheckTime = document.getElementById('useMidnightCheckTime')?.checked || false;
    
    // ALWAYS save the active monitoring times, regardless of checkbox
    config.activeMonitoring.startTime = getTimePicker('activeStartHour', 'activeStartMinute');
    config.activeMonitoring.endTime = getTimePicker('activeEndHour', 'activeEndMinute');
    
    config.activeMonitoring.checkIntervalSeconds = parseInt(document.getElementById('checkInterval')?.value || 7);
    config.activeMonitoring.warningIntervalSeconds = parseInt(document.getElementById('warningInterval')?.value || 10);
    config.activeMonitoring.autoCloseAfterWarnings = parseInt(document.getElementById('maxWarnings')?.value || 3);
    
    // Midnight Check
    config.midnightCheck.enabled = document.getElementById('midnightEnabled')?.checked || false;
    config.midnightCheck.startTime = getTimePicker('midnightStartHour', 'midnightStartMinute');
    config.midnightCheck.endTime = getTimePicker('midnightEndHour', 'midnightEndMinute');
    config.midnightCheck.enableShutdown = document.getElementById('midnightShutdown')?.checked || false;
    config.midnightCheck.countdownSeconds = parseInt(document.getElementById('midnightCountdown')?.value || 10);
    
    // Send to server
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (response.ok) {
      showNotification('✅ Configuration saved successfully!', 'success');
      // Reload config to see changes take effect
      await loadConfig();
    } else {
      showNotification('❌ Error saving configuration', 'error');
    }
  } catch (error) {
    console.error('Error saving config:', error);
    showNotification('❌ Error saving configuration', 'error');
  }
}

// Block Keywords
function addBlockKeyword() {
  const input = document.getElementById('newBlockKeyword');
  if (!input) return;
  
  const keyword = input.value.trim();
  
  if (keyword && !config.blockKeywords.includes(keyword)) {
    config.blockKeywords.push(keyword);
    renderBlockKeywords();
    input.value = '';
  }
}

function removeBlockKeyword(keyword) {
  config.blockKeywords = config.blockKeywords.filter(k => k !== keyword);
  renderBlockKeywords();
}

function renderBlockKeywords() {
  const container = document.getElementById('blockKeywords');
  if (!container) return;
  
  container.innerHTML = (config.blockKeywords || []).map(keyword => `
    <span class="keyword-item">
      ${keyword}
      <button class="remove-btn" onclick="removeBlockKeyword('${keyword.replace(/'/g, "\\'")}')">×</button>
    </span>
  `).join('');
}

// Allow Keywords
function addAllowKeyword() {
  const input = document.getElementById('newAllowKeyword');
  if (!input) return;
  
  const keyword = input.value.trim();
  
  if (keyword && !config.allowKeywords.includes(keyword)) {
    config.allowKeywords.push(keyword);
    renderAllowKeywords();
    input.value = '';
  }
}

function removeAllowKeyword(keyword) {
  config.allowKeywords = config.allowKeywords.filter(k => k !== keyword);
  renderAllowKeywords();
}

function renderAllowKeywords() {
  const container = document.getElementById('allowKeywords');
  if (!container) return;
  
  container.innerHTML = (config.allowKeywords || []).map(keyword => `
    <span class="keyword-item">
      ${keyword}
      <button class="remove-btn" onclick="removeAllowKeyword('${keyword.replace(/'/g, "\\'")}')">×</button>
    </span>
  `).join('');
}

// Blocklist Processes
function addBlocklistProcess() {
  const input = document.getElementById('newBlocklistProcess');
  if (!input) return;
  
  const process = input.value.trim();
  
  if (process && !config.blocklist.processes.includes(process)) {
    config.blocklist.processes.push(process);
    renderBlocklistProcesses();
    input.value = '';
  }
}

function removeBlocklistProcess(process) {
  config.blocklist.processes = config.blocklist.processes.filter(p => p !== process);
  renderBlocklistProcesses();
}

function renderBlocklistProcesses() {
  const container = document.getElementById('blocklistProcesses');
  if (!container) return;
  
  container.innerHTML = (config.blocklist?.processes || []).map(process => `
    <span class="keyword-item">
      ${process}
      <button class="remove-btn" onclick="removeBlocklistProcess('${process.replace(/'/g, "\\'")}')">×</button>
    </span>
  `).join('');
}

// Blocklist Domains
function addBlocklistDomain() {
  const input = document.getElementById('newBlocklistDomain');
  if (!input) return;
  
  const domain = input.value.trim();
  
  if (domain && !config.blocklist.domains.includes(domain)) {
    config.blocklist.domains.push(domain);
    renderBlocklistDomains();
    input.value = '';
  }
}

function removeBlocklistDomain(domain) {
  config.blocklist.domains = config.blocklist.domains.filter(d => d !== domain);
  renderBlocklistDomains();
}

function renderBlocklistDomains() {
  const container = document.getElementById('blocklistDomains');
  if (!container) return;
  
  container.innerHTML = (config.blocklist?.domains || []).map(domain => `
    <span class="keyword-item">
      ${domain}
      <button class="remove-btn" onclick="removeBlocklistDomain('${domain.replace(/'/g, "\\'")}')">×</button>
    </span>
  `).join('');
}

// Whitelist Processes
function addWhitelistProcess() {
  const input = document.getElementById('newWhitelistProcess');
  if (!input) return;
  
  const process = input.value.trim();
  
  if (process && !config.whitelist.processes.includes(process)) {
    config.whitelist.processes.push(process);
    renderWhitelistProcesses();
    input.value = '';
  }
}

function removeWhitelistProcess(process) {
  config.whitelist.processes = config.whitelist.processes.filter(p => p !== process);
  renderWhitelistProcesses();
}

function renderWhitelistProcesses() {
  const container = document.getElementById('whitelistProcesses');
  if (!container) return;
  
  container.innerHTML = (config.whitelist?.processes || []).map(process => `
    <span class="keyword-item">
      ${process}
      <button class="remove-btn" onclick="removeWhitelistProcess('${process.replace(/'/g, "\\'")}')">×</button>
    </span>
  `).join('');
}

// Whitelist Domains
function addWhitelistDomain() {
  const input = document.getElementById('newWhitelistDomain');
  if (!input) return;
  
  const domain = input.value.trim();
  
  if (domain && !config.whitelist.domains.includes(domain)) {
    config.whitelist.domains.push(domain);
    renderWhitelistDomains();
    input.value = '';
  }
}

function removeWhitelistDomain(domain) {
  config.whitelist.domains = config.whitelist.domains.filter(d => d !== domain);
  renderWhitelistDomains();
}

function renderWhitelistDomains() {
  const container = document.getElementById('whitelistDomains');
  if (!container) return;
  
  container.innerHTML = (config.whitelist?.domains || []).map(domain => `
    <span class="keyword-item">
      ${domain}
      <button class="remove-btn" onclick="removeWhitelistDomain('${domain.replace(/'/g, "\\'")}')">×</button>
    </span>
  `).join('');
}

// Tab management
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active from all tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(tabName + 'Tab');
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Add active to selected button
  event.target.classList.add('active');
}

// Section collapse/expand
function toggleSection(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector('.collapse-arrow');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.textContent = '▼';
  } else {
    content.style.display = 'none';
    arrow.textContent = '▶';
  }
}

// Status management
async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('statusText');
    
    if (data.active) {
      statusEl.className = 'status active';
      statusTextEl.textContent = '✅ Active';
    } else {
      statusEl.className = 'status inactive';
      statusTextEl.textContent = '⏸️ Paused';
    }
  } catch (error) {
    console.error('Error loading status:', error);
  }
}

async function startMonitoring() {
  try {
    await fetch('/api/start', { method: 'POST' });
    showNotification('✅ Monitoring started', 'success');
    loadStatus();
  } catch (error) {
    showNotification('❌ Error starting monitoring', 'error');
  }
}

async function stopMonitoring() {
  try {
    await fetch('/api/stop', { method: 'POST' });
    showNotification('⏸️ Monitoring paused', 'success');
    loadStatus();
  } catch (error) {
    showNotification('❌ Error stopping monitoring', 'error');
  }
}

// Logs
function connectLogStream() {
  if (eventSource) {
    eventSource.close();
  }
  
  eventSource = new EventSource('/api/logs/stream');
  
  eventSource.onopen = () => {
    reconnectAttempts = 0;
  };
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.cleared) {
        const logsListEl = document.getElementById('logsList');
        if (logsListEl) {
          logsListEl.innerHTML = '<div class="empty-state">No logs yet</div>';
        }
      } else if (data.logs) {
        renderLogs(data.logs);
      } else if (data.log) {
        addLogToUI(data.log);
      }
    } catch (err) {
      console.error('Error parsing SSE data:', err);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('Log stream error:', error);
    eventSource.close();
    eventSource = null;
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = reconnectAttempts * 2000;
      setTimeout(connectLogStream, delay);
    }
  };
}

function renderLogs(logs) {
  const logsListEl = document.getElementById('logsList');
  if (!logsListEl) return;
  
  if (!logs || logs.length === 0) {
    logsListEl.innerHTML = '<div class="empty-state">No logs yet</div>';
    return;
  }
  
  logsListEl.innerHTML = logs.map(log => createLogHTML(log)).join('');
}

function addLogToUI(log) {
  const logsListEl = document.getElementById('logsList');
  if (!logsListEl) return;
  
  const emptyState = logsListEl.querySelector('.empty-state');
  if (emptyState) {
    logsListEl.innerHTML = '';
  }
  
  const logHTML = createLogHTML(log);
  logsListEl.insertAdjacentHTML('afterbegin', logHTML);
}

function createLogHTML(log) {
  const typeClass = log.type || 'info';
  const icon = getLogIcon(log.type);
  return `
    <div class="log-item ${typeClass}">
      <span class="log-icon">${icon}</span>
      <span class="log-message">${log.message}</span>
      <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
    </div>
  `;
}

function getLogIcon(type) {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    default: return '•';
  }
}

async function clearLogs() {
  try {
    await fetch('/api/logs/clear', { method: 'POST' });
  } catch (error) {
    console.error('Clear logs error:', error);
  }
}

// Notifications
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);