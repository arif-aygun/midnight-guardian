'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// electron mock is resolved via moduleNameMapper; grab the constant it exports
const { MOCK_USER_DATA } = require('../__mocks__/electron');
const CONFIG_PATH = path.join(MOCK_USER_DATA, 'config.json');

// Helpers
function clearConfig() {
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
    if (!fs.existsSync(MOCK_USER_DATA)) fs.mkdirSync(MOCK_USER_DATA, { recursive: true });
}

function writeConfig(obj) {
    if (!fs.existsSync(MOCK_USER_DATA)) fs.mkdirSync(MOCK_USER_DATA, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(obj, null, 2));
}

function freshStore() {
    jest.resetModules();
    // Re-require after resetting so store.js starts with empty in-memory state
    return require('../../src/main/store');
}

beforeEach(() => {
    clearConfig();
});

afterAll(() => {
    clearConfig();
});

// ---------------------------------------------------------------------------
describe('loadStore / getStore', () => {
    test('creates default config when no file exists', () => {
        const { getStore } = freshStore();
        const config = getStore();

        expect(config).toHaveProperty('activeMonitoring');
        expect(config.activeMonitoring.enabled).toBe(true);
        expect(config.isFirstRun).toBe(true);
        expect(fs.existsSync(CONFIG_PATH)).toBe(true);
    });

    test('loads existing config from file', () => {
        writeConfig({ strictMode: true, isFirstRun: false });
        const { getStore } = freshStore();
        const config = getStore();

        expect(config.strictMode).toBe(true);
        expect(config.isFirstRun).toBe(false);
    });

    test('merges defaults for keys missing in existing config', () => {
        writeConfig({ strictMode: true }); // no activeMonitoring key
        const { getStore } = freshStore();
        const config = getStore();

        // Existing value kept
        expect(config.strictMode).toBe(true);
        // Default filled in
        expect(config.activeMonitoring).toBeDefined();
        expect(config.blockKeywords).toBeDefined();
    });

    test('adds isFirstRun=false when absent from existing config', () => {
        writeConfig({ strictMode: false }); // isFirstRun not present
        const { getStore } = freshStore();
        const config = getStore();

        expect(config.isFirstRun).toBe(false);
    });

    test('falls back to defaults when config file is corrupt JSON', () => {
        if (!fs.existsSync(MOCK_USER_DATA)) fs.mkdirSync(MOCK_USER_DATA, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, '{ this is not json }');
        const { getStore } = freshStore();
        const config = getStore();

        expect(config.activeMonitoring).toBeDefined();
    });

    test('returns cached store on subsequent calls without re-reading disk', () => {
        const { getStore } = freshStore();
        getStore(); // first call — creates file
        // Overwrite file after first load
        writeConfig({ strictMode: true });
        const config = getStore(); // second call — should return cache
        // If properly cached, strictMode is still false (from defaults, not the file we just wrote)
        expect(config.strictMode).toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('setStoreValue', () => {
    test('sets a single key and persists to disk', () => {
        const { getStore, setStoreValue } = freshStore();
        getStore(); // initialise

        setStoreValue('strictMode', true);

        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        expect(raw.strictMode).toBe(true);
    });

    test('reflected in subsequent getStore call', () => {
        const { getStore, setStoreValue } = freshStore();
        getStore();
        setStoreValue('closeToTray', false);
        expect(getStore().closeToTray).toBe(false);
    });
});

// ---------------------------------------------------------------------------
describe('updateStore', () => {
    test('merges multiple updates and persists', () => {
        const { getStore, updateStore } = freshStore();
        getStore();

        updateStore({ strictMode: true, runOnStartup: true });

        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        expect(raw.strictMode).toBe(true);
        expect(raw.runOnStartup).toBe(true);
    });

    test('does not throw and does not overwrite on null input', () => {
        const { getStore, updateStore } = freshStore();
        getStore();
        expect(() => updateStore(null)).not.toThrow();
        expect(getStore().activeMonitoring).toBeDefined();
    });

    test('does not throw on array input', () => {
        const { getStore, updateStore } = freshStore();
        getStore();
        expect(() => updateStore(['a', 'b'])).not.toThrow();
    });

    test('does not throw on non-object primitive', () => {
        const { getStore, updateStore } = freshStore();
        getStore();
        expect(() => updateStore('bad')).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
describe('resetStore', () => {
    test('deletes the config file', () => {
        const { getStore, resetStore } = freshStore();
        getStore(); // creates file
        expect(fs.existsSync(CONFIG_PATH)).toBe(true);

        resetStore();
        expect(fs.existsSync(CONFIG_PATH)).toBe(false);
    });

    test('clears in-memory store so next getStore reloads defaults', () => {
        const { getStore, resetStore } = freshStore();
        const s = freshStore(); // isolated instance for this test
        s.getStore();
        s.resetStore();

        // After reset, getStore() should create a fresh store with isFirstRun=true
        const fresh = s.getStore();
        expect(fresh.isFirstRun).toBe(true);
    });

    test('does not throw when config file does not exist', () => {
        const { resetStore } = freshStore();
        expect(() => resetStore()).not.toThrow();
    });
});
