const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let overlayWindow = null;

function createOverlayWindow() {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;

    overlayWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        resizable: false,
        hasShadow: false, // Better for transparency
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,  // SECURITY: Must be enabled - overlay displays untrusted external input
            sandbox: true
        }
    });

    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.loadFile(path.join(__dirname, '..', 'public', 'overlay.html'));

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

// IPC Handler for Click-Through
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setIgnoreMouseEvents(ignore, options);
    }
});

function showOverlay(title, message, isUrgent = false) {
    if (!overlayWindow) createOverlayWindow();

    // Default to blocking if calling showOverlay directly
    overlayWindow.webContents.send('update-overlay', { title, message, isUrgent, mode: 'blocking' });

    overlayWindow.show();
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.focus();
}

function hideOverlay() {
    if (overlayWindow) overlayWindow.hide();
}

function updateOverlay(title, message, extraData = {}) {
    if (overlayWindow && overlayWindow.isVisible()) {
        overlayWindow.webContents.send('update-overlay', { title, message, ...extraData });

        // Don't steal focus if timer-only
        if (extraData.mode !== 'timer-only') {
            overlayWindow.setAlwaysOnTop(true, 'screen-saver');
            overlayWindow.focus();
        } else {
            overlayWindow.setAlwaysOnTop(true, 'screen-saver');
            overlayWindow.blur();
        }
    } else if (extraData.forceShow) {
        if (!overlayWindow) createOverlayWindow();
        overlayWindow.show();
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        overlayWindow.webContents.send('update-overlay', { title, message, ...extraData });
    }
}

module.exports = {
    createOverlayWindow,
    showOverlay,
    hideOverlay,
    updateOverlay
};