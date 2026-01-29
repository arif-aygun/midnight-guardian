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
        show: false, // Start hidden
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    overlayWindow.setIgnoreMouseEvents(false); // Let it capture clicks for "OK" button

    // Load the overlay HTML
    overlayWindow.loadFile(path.join(__dirname, '..', 'public', 'overlay.html'));

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

function showOverlay(title, message, isUrgent = false) {
    if (!overlayWindow) {
        createOverlayWindow();
    }

    // Send content to overlay
    overlayWindow.webContents.send('update-overlay', { title, message, isUrgent });

    overlayWindow.show();
    overlayWindow.setAlwaysOnTop(true, 'screen-saver'); // Maximum priority
    overlayWindow.focus();
}

function hideOverlay() {
    if (overlayWindow) {
        overlayWindow.hide();
    }
}

function updateOverlay(title, message) {
    if (overlayWindow && overlayWindow.isVisible()) {
        overlayWindow.webContents.send('update-overlay', { title, message });
    }
}

module.exports = {
    createOverlayWindow,
    showOverlay,
    hideOverlay,
    updateOverlay
};
