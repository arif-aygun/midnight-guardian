const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// We'll use the user's data directory for persistence in production,
// but for now let's keep it local to be safe during dev or move it.
// Actually, strict electron apps should use app.getPath('userData').
// Let's stick to the local config.js logic for now to minimize friction, 
// OR better, migrate to a proper JSON store in userData.

const USER_DATA_PATH = app.getPath('userData');
const CONFIG_PATH = path.join(USER_DATA_PATH, 'config.json');

// Default config
const defaults = require('../config');

let store = {};

function loadStore() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            store = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
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

module.exports = {
    getStore,
    setStoreValue
};
