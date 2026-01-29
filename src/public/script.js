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

  populateTimeSelects();
  setupHoverEvents();
});

function setupHoverEvents() {
  // Active Mode
  const activeData = {
    'btn-active-off': 'Disables all monitoring logic',
    'btn-active-on': 'Blocks distractors during scheduled hours',
    'strict': 'Prevents quitting or bypassing blocks' // Special case for strict
  };

  // Bind Active
  Object.keys(activeData).forEach(id => {
    let btn;
    if (id === 'strict') btn = document.querySelector('.mode-btn[onclick="toggleStrict()"]');
    else btn = document.getElementById(id);

    if (btn) {
      btn.addEventListener('mouseenter', () => document.getElementById('active-desc').textContent = activeData[id]);
      btn.addEventListener('mouseleave', () => document.getElementById('active-desc').textContent = 'Select a mode to see details');
    }
  });

  // Midnight Mode
  const midnightData = {
    'btn-midnight-off': 'No action taken during sleep hours',
    'btn-midnight-on': 'Dims screen and warns if awake late',
    'btn-midnight-shutdown': 'Forces PC shutdown at end time'
  };

  Object.keys(midnightData).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('mouseenter', () => document.getElementById('midnight-desc').textContent = midnightData[id]);
      btn.addEventListener('mouseleave', () => document.getElementById('midnight-desc').textContent = 'Select a mode to see details');
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
function renderUI() {
  // Active Monitoring State
  const activeEnabled = config.activeMonitoring?.enabled || false;
  updateButtonState('btn-active-off', !activeEnabled);
  updateButtonState('btn-active-on', activeEnabled);

  // Strict Mode State
  const strictEnabled = config.strictMode || false;
  const strictIcon = document.getElementById('strict-icon');
  const strictText = document.getElementById('strict-text');
  if (strictEnabled) {
    document.querySelector('.mode-btn[onclick="toggleStrict()"]')?.classList.add('active');
    if (strictIcon) strictIcon.textContent = '🔒';
    if (strictText) strictText.textContent = 'Strict';
  } else {
    document.querySelector('.mode-btn[onclick="toggleStrict()"]')?.classList.remove('active');
    if (strictIcon) strictIcon.textContent = '🔓';
    if (strictText) strictText.textContent = 'Strict';
  }

  // Midnight Check State
  const midnightEnabled = config.midnightCheck?.enabled || false;
  const shutdownEnabled = config.midnightCheck?.enableShutdown || false;

  updateButtonState('btn-midnight-off', !midnightEnabled);
  updateButtonState('btn-midnight-on', midnightEnabled && !shutdownEnabled);
  updateButtonState('btn-midnight-shutdown', midnightEnabled && shutdownEnabled);

  // Configs
  document.getElementById('runOnStartup').checked = config.runOnStartup || false;

  // Schedules
  updateTimeDisplay('active', config.activeMonitoring);
  updateTimeDisplay('midnight', config.midnightCheck);

  // Chips
  renderChips('blockChips', config.blockKeywords, 'block');
  renderChips('allowChips', config.allowKeywords, 'allow');

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
    chip.innerHTML = `
            ${item}
            <span style="margin-left:4px; opacity:0.5; cursor:pointer;" onclick="removeKeyword('${type}', '${item.replace(/'/g, "\\'")}')">×</span>
        `;
    container.appendChild(chip);
  });
}

// Logic Actions

function toggleStrict() {
  config.strictMode = !config.strictMode;
  saveConfig();
}

function setActiveMode(enabled) {
  if (!config.activeMonitoring) config.activeMonitoring = {};
  config.activeMonitoring.enabled = enabled;
  saveConfig();
}

function setMidnightMode(enabled, shutdown) {
  if (!config.midnightCheck) config.midnightCheck = {};
  config.midnightCheck.enabled = enabled;
  config.midnightCheck.enableShutdown = shutdown;
  saveConfig();
}

async function saveConfig() {
  // Config items that aren't mode buttons (like startup)
  config.runOnStartup = document.getElementById('runOnStartup').checked;

  await window.electronAPI.saveConfig(config);
  renderUI(); // Re-render to show active states
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
    // We only have one keyword section now (Blocked) based on UI, 
    // but let's keep logic flexible if we add Allowed back
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
function openTimeModal(type) {
  currentModalType = type;
  const settings = type === 'active' ? config.activeMonitoring : config.midnightCheck;
  const [sk, sm] = (settings.startTime || '00:00').split(':');
  const [ek, em] = (settings.endTime || '00:00').split(':');

  document.getElementById('modalStartHour').value = sk;
  document.getElementById('modalStartMinute').value = sm;
  document.getElementById('modalEndHour').value = ek;
  document.getElementById('modalEndMinute').value = em;

  document.getElementById('timeModal').classList.add('open');
}

function saveTimeModal() {
  const sh = document.getElementById('modalStartHour').value;
  const sm = document.getElementById('modalStartMinute').value;
  const eh = document.getElementById('modalEndHour').value;
  const em = document.getElementById('modalEndMinute').value;

  const timeStr_start = `${sh}:${sm}`;
  const timeStr_end = `${eh}:${em}`;

  if (currentModalType === 'active') {
    config.activeMonitoring.startTime = timeStr_start;
    config.activeMonitoring.endTime = timeStr_end;
  } else {
    config.midnightCheck.startTime = timeStr_start;
    config.midnightCheck.endTime = timeStr_end;
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