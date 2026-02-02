const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Configuration is stored in userData directory as JSON
// Location: Windows - C:\Users\<username>\AppData\Roaming\Midnight Guardian\config.json
//          macOS - ~/Library/Application Support/Midnight Guardian/config.json
//          Linux - ~/.config/Midnight Guardian/config.json

const USER_DATA_PATH = app.getPath('userData');
const CONFIG_PATH = path.join(USER_DATA_PATH, 'config.json');

// Default config (migrated from old config.js)
const defaults = {
    // Focus Mode settings
    activeMonitoring: {
        enabled: true,               // Focus mode on/off
        startTime: '09:00',          // Monitoring window start
        endTime: '23:59',            // Monitoring window end
        checkIntervalSeconds: 7,     // How often to check active window
        warningIntervalSeconds: 10,  // Time between warnings
        autoCloseAfterWarnings: 3,   // Warnings before force-close (Active mode)
        shutdownAtEnd: false         // Shutdown PC when endTime is reached
    },

    // Scheduled Shutdown (independent daily shutdown)
    scheduledShutdown: {
        enabled: false,              // Enable daily shutdown
        time: '23:00'                // Time to shutdown (HH:MM)
    },

    // Keyword Rules
    blockKeywords: ['youtube', 'facebook', 'instagram', 'twitter', 'reddit', 'tiktok', 'netflix', 'game', 'steam', 'twitch'],
    allowKeywords: ['work', 'study', 'tutorial', 'documentation', 'course', 'learn', 'education'],

    // Process & Domain Lists (hardcoded for now, not in UI)
    blocklist: {
        processes: ['steam.exe', 'epicgameslauncher.exe', 'riotclientservices.exe', 'leagueclient.exe'],
        domains: ['youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'reddit.com', 'tiktok.com']
    },
    whitelist: {
        processes: ['code.exe', 'devenv.exe', 'idea64.exe', 'sublime_text.exe', 'notion.exe'],
        domains: ['github.com', 'stackoverflow.com', 'developer.mozilla.org', 'docs.microsoft.com', 'leetcode.com']
    },

    // System Settings
    strictMode: false,               // Strict mode (no warnings, immediate close)
    runOnStartup: false,             // Launch on Windows startup
    closeToTray: true,               // Minimize to tray instead of closing
    dryRun: false                    // Testing mode (doesn't actually close apps/shutdown)
};

let store = {};

function loadStore() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const rawConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            store = rawConfig;
            // Merge with defaults to ensure new keys exist
            if (store.isFirstRun === undefined) store.isFirstRun = false;
            store = { ...defaults, ...store };
        } else {
            store = { ...defaults, isFirstRun: true };
            // Save defaults immediately
            saveStore();
        }
    } catch (error) {
        console.error('Error loading config:', error);
        store = { ...defaults };
    }
    return store;
}

function saveStore() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2));
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function getStore() {
    if (Object.keys(store).length === 0) {
        loadStore();
    }
    return store;
}

function setStoreValue(key, value) {
    store[key] = value;
    saveStore();
}

function updateStore(updates) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        console.error('updateStore: Invalid updates parameter');
        return;
    }
    Object.keys(updates).forEach(key => {
        store[key] = updates[key];
    });
    saveStore();
}

module.exports = {
    getStore,
    setStoreValue,
    updateStore
};
