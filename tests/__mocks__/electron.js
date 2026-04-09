const os = require('os');
const path = require('path');

const MOCK_USER_DATA = path.join(os.tmpdir(), 'midnight-guardian-test');

const mockWebContents = { send: jest.fn(), isDevToolsOpened: jest.fn(() => false) };
const mockWin = {
    webContents: mockWebContents,
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    isVisible: jest.fn(() => true),
    setAlwaysOnTop: jest.fn(),
    setIgnoreMouseEvents: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    getBounds: jest.fn(() => ({ width: 400, height: 700 })),
    setPosition: jest.fn(),
};

const BrowserWindow = jest.fn(() => mockWin);
BrowserWindow.getAllWindows = jest.fn(() => [mockWin]);
BrowserWindow.fromWebContents = jest.fn(() => mockWin);

const screen = {
    getPrimaryDisplay: jest.fn(() => ({
        workAreaSize: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
};

const ipcMain = {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
};

const app = {
    getPath: jest.fn((name) => name === 'userData' ? MOCK_USER_DATA : os.tmpdir()),
    getVersion: jest.fn(() => '1.0.1'),
    setLoginItemSettings: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
};

const Tray = jest.fn(() => ({
    setToolTip: jest.fn(),
    on: jest.fn(),
    popUpContextMenu: jest.fn(),
}));

const Menu = {
    buildFromTemplate: jest.fn(() => ({})),
};

const shell = { openExternal: jest.fn() };
const dialog = { showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })) };

module.exports = {
    BrowserWindow,
    screen,
    ipcMain,
    app,
    Tray,
    Menu,
    shell,
    dialog,
    MOCK_USER_DATA,
};
