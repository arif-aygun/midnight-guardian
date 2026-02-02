# Archived Web-Based Version

## What's in this folder?

This folder contains the **original web-based architecture** of Midnight Guardian, before it was migrated to a full Electron desktop application.

## Files Archived

- **`index.js`** (645 lines) - Original entry point with embedded monitoring logic
- **`server.js`** (200 lines) - Express server for the web dashboard
- **`config.js`** (50 lines) - Original configuration file

## Why was this archived?

The project migrated from a web-based architecture (Node.js + Express + Browser UI) to a native desktop application (Electron). The new architecture is located in:

- **Entry**: `src/main/main.js` - Electron main process
- **Monitoring**: `src/main/monitor.js` - Refactored monitoring logic
- **Storage**: `src/main/store.js` - Persistent configuration
- **UI**: `src/public/*` - Shared HTML/CSS/JS files (loaded directly by Electron)

## Future Use

This code is preserved for potential future features:

### Possible Use Case: Remote Web Dashboard

The archived Express server could be adapted to provide a **remote web dashboard** accessible from other devices on your network:

```
http://192.168.1.x:3000
```

**Potential features:**
- Monitor status from phone/tablet
- View activity logs remotely
- Adjust settings from other devices
- Multi-user/family monitoring dashboard

### How to Use This Code

If you want to run the old web version:

1. Copy these files back to `src/` (temporarily)
2. Run: `node src/index.js`
3. Open: `http://localhost:3000`

**Note:** The configuration format may need updating to match the current Electron app's store structure.

## Migration Notes

### What Changed

| Old (Web) | New (Electron) |
|-----------|----------------|
| `index.js` monitors windows | `monitor.js` handles monitoring |
| `server.js` serves web UI | HTML loaded directly via `loadFile()` |
| `config.js` as module | `store.js` with JSON persistence |
| Port 3000 web dashboard | Native Electron window |
| Browser-based UI | Desktop app with tray icon |

### Breaking Changes

- Configuration format changed from `config.js` exports to JSON store
- No longer need Express server for UI
- Monitoring logic separated into dedicated module
- Uses Electron IPC instead of REST API

---

**Archived on:** 2026-02-01  
**Reason:** Migration to Electron desktop app  
**Status:** Preserved for reference and potential web dashboard feature
