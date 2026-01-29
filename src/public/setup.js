let currentStep = 1;
const totalSteps = 4;
let config = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Populate Time Selects
    populateTimeSelects();

    // Load default config
    config = await window.electronAPI.getConfig();

    // Set Navigation Listeners
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('backBtn').addEventListener('click', prevStep);

    // Set initial values
    if (config.midnightCheck) {
        setTimeInputs(config.midnightCheck.startTime, config.midnightCheck.endTime);
    }
});

function updateUI() {
    // Show/Hide Steps
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');

    // Update Dots
    document.querySelectorAll('.dot').forEach((el, idx) => {
        if (idx < currentStep) el.classList.add('active');
        else el.classList.remove('active');
    });

    // Update Buttons
    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');

    backBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

    if (currentStep === totalSteps) {
        nextBtn.textContent = 'Finish';
        nextBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.style.background = '';
    }
}

async function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateUI();
    } else {
        await finishSetup();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateUI();
    }
}

async function finishSetup() {
    // Gather Data
    const runOnStartup = document.getElementById('runOnStartup').checked;
    const startHour = document.getElementById('startHour').value;
    const startMinute = document.getElementById('startMinute').value;
    const endHour = document.getElementById('endHour').value;
    const endMinute = document.getElementById('endMinute').value;

    // Update Config
    config.runOnStartup = runOnStartup;

    if (!config.midnightCheck) config.midnightCheck = {};
    config.midnightCheck.enabled = true; // Enable by default on setup
    config.midnightCheck.startTime = `${startHour}:${startMinute}`;
    config.midnightCheck.endTime = `${endHour}:${endMinute}`;

    // Sync active monitoring if it's default
    if (!config.activeMonitoring) config.activeMonitoring = {};
    config.activeMonitoring.startTime = `${startHour}:${startMinute}`;
    config.activeMonitoring.endTime = `${endHour}:${endMinute}`;
    config.activeMonitoring.useMidnightCheckTime = true;
    config.activeMonitoring.enabled = true; // Enable basic monitoring by default

    // Save
    await window.electronAPI.saveConfig(config);

    // Notify Main Process to switch view
    window.electronAPI.completeSetup();
}

// Helpers
function populateTimeSelects() {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    ['startHour', 'endHour'].forEach(id => {
        const sel = document.getElementById(id);
        hours.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            sel.appendChild(opt);
        });
    });

    ['startMinute', 'endMinute'].forEach(id => {
        const sel = document.getElementById(id);
        minutes.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            sel.appendChild(opt);
        });
    });
}

function setTimeInputs(start, end) {
    if (!start || !end) return;
    const [sh, sm] = start.split(':');
    const [eh, em] = end.split(':');

    document.getElementById('startHour').value = sh;
    document.getElementById('startMinute').value = sm;
    document.getElementById('endHour').value = eh;
    document.getElementById('endMinute').value = em;
}
