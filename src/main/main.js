const { app, BrowserWindow, Tray, Menu, ipcMain, shell, screen } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { setupMonitor, stopMonitor } = require('./monitor');
const { getStore, setStoreValue } = require('./store');

let mainWindow;
let tray;
let isQuitting = false;

// Configs
const ASSETS_PATH = path.join(__dirname, '..', 'public');
const ICON_PATH = path.join(ASSETS_PATH, 'icon.png'); // Need to ensure this exists or use default

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400, // Compact width
        height: 700,
        show: false,
        frame: false, // Frameless
        fullscreenable: false,
        resizable: false,
        skipTaskbar: true, // Hide from taskbar
        alwaysOnTop: true, // Keep on top of other windows
        backgroundColor: '#1a1a2e',
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    // Hide when losing focus (blur) - DISABLED per user request
    // mainWindow.on('blur', () => {
    //     if (!mainWindow.webContents.isDevToolsOpened()) {
    //         mainWindow.hide();
    //     }
    // });

    // Check first run
    const config = getStore();
    const targetPage = (config.isFirstRun) ? 'setup.html' : 'index.html';

    mainWindow.loadFile(path.join(__dirname, '..', 'public', targetPage));

    mainWindow.once('ready-to-show', () => {
        showWindow();
    });

    // Close to Tray logic
    mainWindow.on('close', (event) => {
        const config = getStore();
        if (!isQuitting && (config.closeToTray !== false)) { // Default to true
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    // Open links in external browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}



function toggleWindow() {
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        showWindow();
    }
}

function showWindow() {
    const windowBounds = mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    // Use workArea to respect taskbar position
    const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;
    // Fixed Bottom Right Positioning (12px padding from edges)
    const padding = 12;
    const x = Math.round(workX + workWidth - windowBounds.width - padding);
    const y = Math.round(workY + workHeight - windowBounds.height - padding);
    mainWindow.setPosition(x, y, false);
    mainWindow.show();
    mainWindow.focus();
}

function createTray() {
    try {
        tray = new Tray(ICON_PATH);
        tray.setToolTip('Midnight Guardian');

        // Toggle on click
        tray.on('click', (event) => {
            toggleWindow();
        });

        tray.on('double-click', () => {
            toggleWindow();
        });

        // Right click for context menu (Quit option)
        // We only want Quit here since Open is the main action
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Quit Midnight Guardian',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.on('right-click', () => {
            tray.popUpContextMenu(contextMenu);
        });

    } catch (err) {
        console.error('Failed to create tray:', err);
    }
}

app.whenReady().then(() => {
    // Store auto-initializes on first getStore() call

    createWindow();
    createTray();

    // Start the monitor
    setupMonitor();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Respect closeToTray setting, generally we keep running in tray
    if (process.platform !== 'darwin') {
        // We don't quit here because of the tray
    }
});

// IPC Handlers
ipcMain.handle('get-config', async () => {
    return getStore();
});

ipcMain.handle('save-config', async (event, newConfig) => {
    // Update store
    Object.keys(newConfig).forEach(key => {
        setStoreValue(key, newConfig[key]);
    });

    // Apply Startup Setting
    const openAtLogin = newConfig.runOnStartup === true;
    app.setLoginItemSettings({
        openAtLogin: openAtLogin,
        path: app.getPath('exe')
    });

    // Restart monitor with new config
    stopMonitor();
    setupMonitor();

    return { success: true };
});

ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
});

ipcMain.on('quit-app', () => {
    const config = getStore();
    if (config.strictMode) {
        // Strict Mode Enabled: Prevent Quit
        // Verify if we are also in active hours? User said "Prevent quitting".
        // Strict Mode usually implies "No Escape" regardless of time, or only during active time?
        // Let's assume global switch for now as per UI button.
        // We should warn the user.
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Strict Mode Active',
            message: 'You cannot close the application while Strict Mode is enabled.\n\nDisable Strict Mode in the dashboard first.',
            buttons: ['OK']
        });
        return;
    }

    isQuitting = true;
    app.quit();
});

// Handle generic logs from monitor and send to renderer
// functionality needs to be added to monitor.js to emit events
ipcMain.on('hide-overlay', () => {
    require('./overlay').hideOverlay();
});

ipcMain.on('setup-complete', () => {
    setStoreValue('isFirstRun', false);
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
});
