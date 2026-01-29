const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require('electron');
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
        height: 600,
        show: false,
        frame: false, // Frameless
        fullscreenable: false,
        resizable: false,
        skipTaskbar: true, // Hide from taskbar
        backgroundColor: '#1a1a2e',
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    // Hide when losing focus (blur)
    mainWindow.on('blur', () => {
        if (!mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.hide();
        }
    });

    // Check first run
    const config = getStore();
    const targetPage = (config.isFirstRun) ? 'setup.html' : 'index.html';

    mainWindow.loadFile(path.join(__dirname, '..', 'public', targetPage));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
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

const { screen } = require('electron'); // Needs to be added to top imports if not there

function toggleWindow() {
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        showWindow();
    }
}

function showWindow() {
    // Get tray position
    const trayBounds = tray.getBounds();
    const windowBounds = mainWindow.getBounds();

    // Position window vertically above the tray icon
    let x, y;

    // Calculate position - simple bottom right logic for now
    // Ideally we check where the taskbar is, but assuming bottom right taskbar:
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Default to bottom right alignment
    // Center horizontally relative to tray icon
    x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));

    // Position vertically
    // If tray is at the bottom
    if (trayBounds.y > height / 2) {
        y = Math.round(trayBounds.y - windowBounds.height - 10);
    } else {
        // Tray is at top
        y = Math.round(trayBounds.y + trayBounds.height + 10);
    }

    // Ensure inside screen bounds
    // ... basic clamping if needed

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
    // Initialize Store
    // TODO: Implement store initialization

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
