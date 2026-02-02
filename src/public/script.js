let config = {};
let currentModalType = '';

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();

  // Modal background click close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // IPC listeners
  window.electronAPI.onUpdateOverlay((overlayConfig) => {
    // Optional: Update specific UI if overlay changes state
  });

  window.electronAPI.onLogUpdate((log) => {
    const logsList = document.getElementById('logsList');
    if (logsList) {
      const entry = document.createElement('div');
      const time = new Date(log.timestamp).toLocaleTimeString();
      entry.style.marginBottom = '4px';
      entry.style.borderBottom = '1px solid #333';
      const timeSpan = document.createElement('span');
      timeSpan.style.color = '#666';
      timeSpan.textContent = `[${time}]`;
      entry.appendChild(timeSpan);
      entry.appendChild(document.createTextNode(' ' + log.message));
      logsList.prepend(entry);
    }
  });

  populateTimeSelects();
  setupHoverEvents();
});

function setupHoverEvents() {
  // Active Mode
  const activeData = {
    'btn-off': 'Disables all monitoring logic',
    'btn-active': 'Blocks distractors during scheduled hours',
    'btn-strict': 'Prevents quitting and enforces blocks',
    'shutdownAtEnd': 'Forces PC shutdown when focus time ends'
  };

  Object.keys(activeData).forEach(id => {
    const btn = document.getElementById(id);
    // Bind to description. If btn is checkbox/parent, bind accordingly?
    // Using previous pattern:
    if (btn) {
      btn.addEventListener('mouseenter', () => {
        if (document.getElementById('active-desc'))
          document.getElementById('active-desc').textContent = activeData[id];
      });
      btn.addEventListener('mouseleave', () => {
        if (document.getElementById('active-desc'))
          document.getElementById('active-desc').textContent = 'Select a mode to see details';
      });
    }
  });
}

// Load configuration
async function loadConfig() {
  try {
    config = await window.electronAPI.getConfig();
    renderUI();
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Render Logic
// Render Logic
function renderUI() {
  // Active Monitoring State
  const activeEnabled = config.activeMonitoring?.enabled || false;
  // Strict Mode State
  const strictEnabled = config.strictMode || false;

  // Button States: Off, Active, Strict
  updateButtonState('btn-off', !activeEnabled);
  updateButtonState('btn-active', activeEnabled && !strictEnabled);
  updateButtonState('btn-strict', activeEnabled && strictEnabled);

  // Configs
  if (document.getElementById('runOnStartup')) {
    document.getElementById('runOnStartup').checked = config.runOnStartup || false;
  }

  if (document.getElementById('shutdownAtEnd')) {
    document.getElementById('shutdownAtEnd').checked = config.activeMonitoring?.shutdownAtEnd || false;
  }


  // Schedules
  updateTimeDisplay('active', config.activeMonitoring);

  // Scheduled Shutdown
  if (config.scheduledShutdown) {
    const sEnabled = document.getElementById('shutdownEnabled');
    const sTimeDisplay = document.getElementById('shutdownTimeDisplay');

    if (sEnabled) sEnabled.checked = config.scheduledShutdown.enabled || false;

    if (sTimeDisplay) {
      // Format time to 12h AM/PM
      const rawTime = config.scheduledShutdown.time || '23:00';
      const [h, m] = rawTime.split(':');
      const d = new Date();
      d.setHours(h);
      d.setMinutes(m);
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      sTimeDisplay.textContent = timeStr;
    }
  }

  // Chips
  renderChips('blockChips', config.blockKeywords, 'block');
  // Removed allowChips rendering if UI element is gone, or keep if UI still exists? 
  // UI for Allowed Chips was removed in previous steps? Wait, I didn't verify that fully.
  // The 'Sections' replacement in index.html replaced everything from Active to Rules.
  // Wait, I replaced 'Section: Sleep Guardian' but kept 'Section: Rules & Whitelist'.
  // Let's assume 'allowChips' container might still be there if I didn't delete it.
  // I will check if 'allowChips' exists before rendering.
  if (document.getElementById('allowChips')) {
    renderChips('allowChips', config.allowKeywords, 'allow');
  }

  // Stats (Mock for now)
  if (document.getElementById('stat-blocks')) document.getElementById('stat-blocks').textContent = config.stats?.blocksBlocked || 0;
  if (document.getElementById('stat-saved')) document.getElementById('stat-saved').textContent = config.stats?.timeSaved || '0h 0m';
  if (document.getElementById('stat-streak')) document.getElementById('stat-streak').textContent = config.stats?.streakDays || 1;
}

function updateButtonState(id, isActive) {
  const btn = document.getElementById(id);
  if (!btn) return;
  if (isActive) btn.classList.add('active');
  else btn.classList.remove('active');
}

function updateTimeDisplay(type, settings) {
  const display = document.getElementById(`${type}TimeDisplay`);
  if (settings && settings.startTime && settings.endTime) {
    display.textContent = `${settings.startTime} - ${settings.endTime}`;
  }
}

function renderChips(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  (items || []).forEach(item => {
    const chip = document.createElement('div');
    chip.className = `chip ${type}`;
    
    // Add the keyword text safely
    const textNode = document.createTextNode(item);
    chip.appendChild(textNode);
    
    // Add the remove ("×") control with a safe event listener
    const removeSpan = document.createElement('span');
    removeSpan.textContent = '×';
    removeSpan.style.marginLeft = '4px';
    removeSpan.style.opacity = '0.5';
    removeSpan.style.cursor = 'pointer';
    removeSpan.addEventListener('click', () => {
      removeKeyword(type, item);
    });
    
    chip.appendChild(removeSpan);
    container.appendChild(chip);
  });
}

// Logic Actions

// Logic Actions

function toggleStrict() {
  // Ensure activeMonitoring exists
  if (!config.activeMonitoring) config.activeMonitoring = {};

  // Toggle strict mode
  config.strictMode = !config.strictMode;

  // If enabling strict mode, ensure monitoring is ON
  if (config.strictMode) {
    config.activeMonitoring.enabled = true;
  }

  saveConfig();
}

function setActiveMode(enabled, shutdown) {
  if (!config.activeMonitoring) config.activeMonitoring = {};
  config.activeMonitoring.enabled = enabled;
  // If 'Strict' button clicked (enable=true, shutdown=true), set strictMode
  // logic map: 
  // Off: enabled=false
  // Active: enabled=true, strict=false
  // Strict: enabled=true, strict=true

  // Wait, strictMode is a separate top-level config?
  // Previous code had toggleStrict(). 
  // New UI has 3 buttons: Off, Active, Strict.
  // Let's map them:

  if (shutdown) {
    // This param name 'shutdown' in the HTML onclick for Strict is confusing, 
    // let's assume it means 'isStrict' based on the "Strict" label.
    config.strictMode = true;
  } else {
    if (enabled) config.strictMode = false;
    // if disabled (Off), strictly speaking strictMode doesn't matter, but let's leave it.
  }

  saveConfig();
}

async function saveConfig() {
  try {
    // Config items
    const runOnStartupEl = document.getElementById('runOnStartup');
    if (runOnStartupEl) config.runOnStartup = runOnStartupEl.checked;

    if (config.activeMonitoring) {
      const shutdownAtEndEl = document.getElementById('shutdownAtEnd');
      if (shutdownAtEndEl) config.activeMonitoring.shutdownAtEnd = shutdownAtEndEl.checked;
    }

    // Scheduled Shutdown
    if (!config.scheduledShutdown) config.scheduledShutdown = {};
    const sEnabled = document.getElementById('shutdownEnabled');
    const sTime = document.getElementById('shutdownTime');
    if (sEnabled) config.scheduledShutdown.enabled = sEnabled.checked;
    if (sTime) config.scheduledShutdown.time = sTime.value;

    await window.electronAPI.saveConfig(config);

    // Visual feedback
    const saveBtn = document.querySelector('button[onclick="saveConfig()"] span');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✅ Saved';
      setTimeout(() => saveBtn.textContent = originalText, 1500);
    }

    renderUI();
  } catch (error) {
    console.error('Save failed:', error);
    alert('Failed to save settings: ' + error.message);
  }
}

// Keyword Logic
function openKeywordModal(type) {
  currentModalType = type;
  document.getElementById('modalKeywordInput').value = '';
  document.getElementById('keywordModal').classList.add('open');
  document.getElementById('modalKeywordInput').focus();
}

function saveKeywordModal() {
  const val = document.getElementById('modalKeywordInput').value.trim();
  if (val) {
    const targetList = currentModalType === 'block' ? 'blockKeywords' : 'allowKeywords';
    if (!config[targetList]) config[targetList] = [];
    if (!config[targetList].includes(val)) config[targetList].push(val);
    saveConfig();
    closeModal('keywordModal');
  }
}

function removeKeyword(type, val) {
  const targetList = type === 'block' ? 'blockKeywords' : 'allowKeywords';
  if (config[targetList]) {
    config[targetList] = config[targetList].filter(k => k !== val);
  }
  saveConfig();
}

// Time Logic
// Time Logic
let timeModalTarget = 'active'; // 'active' or 'shutdown'

function openTimeModal(type = 'active') {
  timeModalTarget = type;
  let settings = {};

  if (type === 'active') {
    settings = config.activeMonitoring || {};
  } else if (type === 'shutdown') {
    // Allow single time for shutdown, but modal expects start/end
    // We will hide the 'start' part or 'end' part? 
    // The modal has start/end inputs.
    // Re-using the modal for a single time might be tricky if we don't hide one input.
    // For simplicity, let's just use the "End Time" slot as the "Shutdown Time" and hide the Start Time row in CSS?
    // Or better: just populate both with the same time or dummy, but only save one.
    // Let's hide the start time input group if mode is shutdown.

    const t = config.scheduledShutdown?.time || '23:00';
    settings = { startTime: '00:00', endTime: t };
  }

  const [sk, sm] = (settings.startTime || '00:00').split(':');
  const [ek, em] = (settings.endTime || '00:00').split(':');

  document.getElementById('modalStartHour').value = sk;
  document.getElementById('modalStartMinute').value = sm;
  document.getElementById('modalEndHour').value = ek;
  document.getElementById('modalEndMinute').value = em;

  // Toggle visibility and labels based on target
  const startGroup = document.getElementById('modalStartGroup');
  const endLabel = document.getElementById('modalEndLabel');

  if (type === 'shutdown') {
    if (startGroup) startGroup.style.display = 'none'; // Hide Start Time
    if (endLabel) endLabel.textContent = 'Shutdown Time';
  } else {
    if (startGroup) startGroup.style.display = 'flex'; // Show Start Time
    if (endLabel) endLabel.textContent = 'End Time';
  }

  document.getElementById('timeModal').classList.add('open');
}

function saveTimeModal() {
  const sh = document.getElementById('modalStartHour').value;
  const sm = document.getElementById('modalStartMinute').value;
  const eh = document.getElementById('modalEndHour').value;
  const em = document.getElementById('modalEndMinute').value;

  const timeStr_start = `${sh}:${sm}`;
  const timeStr_end = `${eh}:${em}`;

  if (timeModalTarget === 'active') {
    if (!config.activeMonitoring) config.activeMonitoring = {};
    config.activeMonitoring.startTime = timeStr_start;
    config.activeMonitoring.endTime = timeStr_end;
  } else if (timeModalTarget === 'shutdown') {
    if (!config.scheduledShutdown) config.scheduledShutdown = {};
    config.scheduledShutdown.time = timeStr_end;
  }

  saveConfig();
  closeModal('timeModal');
}

// Logs
function showLogs() {
  // Ideally fetch logs via IPC
  // For now we just show
  document.getElementById('logsModal').classList.add('open');
}

function clearLogs() {
  document.getElementById('logsList').innerHTML = '';
}

// Shared
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function populateTimeSelects() {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  ['modalStartHour', 'modalEndHour'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    hours.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      sel.appendChild(opt);
    });
  });

  ['modalStartMinute', 'modalEndMinute'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    minutes.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
  });
}