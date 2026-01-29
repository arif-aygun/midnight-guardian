const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
    stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
    minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),

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

    completeSetup: () => ipcRenderer.send('setup-complete')
});
