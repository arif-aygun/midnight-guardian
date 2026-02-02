# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-02

### 🎉 Initial Release

This is the first official release of Midnight Guardian - a smart distraction blocker for Windows that helps you maintain healthy digital habits and protect your sleep schedule.

### ✨ Features

#### Focus Mode
- **Three monitoring modes**: Off, Active (with warnings), and Strict (immediate action)
- **Custom time windows**: Set start and end times for when monitoring is active
- **Real-time enforcement**: Monitors active windows every 7 seconds
- Progressive warning system in Active mode (3 warnings before force-close)
- Immediate force-close in Strict mode

#### Smart Blocking System
- **Keyword-based blocking**: Block applications and websites by window title keywords
- **Allow keywords override**: Whitelist specific keywords to create exceptions
- **Priority system**: Hardcoded whitelist → Allowed keywords → Blocked keywords
- Comprehensive default blocked keywords (youtube, facebook, instagram, twitter, reddit, tiktok, netflix, game, steam, twitch)
- Default allowed keywords for productivity (work, study, tutorial, documentation, course, learn, education)

#### Shutdown Options
- **Shutdown at End Time**: Automatically shutdown PC when focus time window ends
- **Scheduled Shutdown**: Daily shutdown at a specific time (works independently of focus mode)
- **60-second countdown**: Warning timer before shutdown executes
- Cancel option during countdown

#### Rules Management
- Easy-to-use UI for managing blocked and allowed keywords
- Visual distinction: blocked keywords shown in red, allowed keywords in green
- Simple add/remove functionality with intuitive interface

#### System Integration
- **System tray**: Minimize to system tray, always accessible
- **Run on Startup**: Optional automatic launch when Windows starts
- **Persistent configuration**: Settings saved to AppData/Roaming/Midnight Guardian
- First-run setup wizard for easy initial configuration

#### User Interface
- Modern, clean dark theme
- Dashboard with four main sections: Focus Mode, Shutdown Options, Rules, and System
- Real-time status indicators
- Activity logs viewer

### 🏗️ Technical Details

- Built with Electron 40.1.0 and Node.js
- Uses electron-builder for packaging
- Active window tracking via active-win package
- System notifications via node-notifier
- Scheduled tasks via node-schedule
- Windows 10/11 support

### 📦 Available Downloads

- **Windows**: NSIS Installer (.exe) and Portable (.exe)

### 🔒 Platform Support

- ✅ **Windows 10/11**: Fully supported and tested
- ⏳ **macOS & Linux**: Planned for future releases

### 📝 Notes

- Requires administrator privileges for process management features
- Configuration stored in: `%APPDATA%\Midnight Guardian\config.json`
- State file stored in: `%APPDATA%\Midnight Guardian\state.json`

[1.0.0]: https://github.com/arif-aygun/midnight-guardian/releases/tag/v1.0.0
