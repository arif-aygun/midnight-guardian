const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
    quitApp: () => ipcRenderer.send('quit-app'),

    onLogUpdate: (callback) => {
        const subscription = (event, log) => callback(log);
        ipcRenderer.on('log-update', subscription);
        return () => ipcRenderer.removeListener('log-update', subscription);
    },

    onStatusUpdate: (callback) => {
        const subscription = (event, status) => callback(status);
        ipcRenderer.on('status-update', subscription);
        return () => ipcRenderer.removeListener('status-update', subscription);
    },
    onUpdateOverlay: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('update-overlay', subscription);
        return () => ipcRenderer.removeListener('update-overlay', subscription);
    },

    hideOverlay: () => ipcRenderer.send('hide-overlay'),
    setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),

    completeSetup: () => ipcRenderer.send('setup-complete')
});
