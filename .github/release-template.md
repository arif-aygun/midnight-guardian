# Midnight Guardian v1.0.0 🌙

> Smart distraction blocker for Windows that helps you maintain healthy digital habits and protect your sleep schedule.

## 🎉 First Official Release!

This is the **first stable release** of Midnight Guardian. Thank you for your interest in this project!

## ✨ What's Included

### Focus Mode
- 🎯 **Three monitoring modes**: Off, Active (progressive warnings), and Strict (immediate action)
- ⏰ **Custom time windows**: Define when monitoring should be active
- 🔄 **Real-time enforcement**: Monitors active windows every 7 seconds
- ⚡ **Smart warnings**: 3 warnings before force-close in Active mode
- 🔒 **Strict enforcement**: Immediate force-close in Strict mode

### Smart Blocking System
- 🔑 **Keyword-based blocking**: Block apps/sites by window title keywords
- ✅ **Allow keywords override**: Whitelist specific keywords for exceptions
- 📋 **Priority system**: Hardcoded whitelist → Allowed keywords → Blocked keywords
- 🎯 **Comprehensive defaults**: 
  - **Blocked**: youtube, facebook, instagram, twitter, reddit, tiktok, netflix, game, steam, twitch
  - **Allowed**: work, study, tutorial, documentation, course, learn, education

### Shutdown Options
- 💤 **Shutdown at End Time**: Auto-shutdown when focus window ends
- ⏰ **Scheduled Shutdown**: Daily shutdown at specific time
- ⏱️ **60-second countdown**: Warning timer before shutdown
- ❌ **Cancel option**: Stop shutdown during countdown

### System Integration
- 📌 **System tray**: Always accessible from tray
- 🚀 **Run on Startup**: Optional auto-launch with Windows
- 💾 **Persistent config**: Settings saved automatically
- 🎨 **Modern UI**: Clean, intuitive dark theme
- 📝 **Activity logs**: Track what's being blocked

## 📥 Installation

### Windows (Recommended)
Download the installer for Windows:
- **NSIS Installer** (`.exe`) - Full installation with shortcuts
- **Portable** (`.exe`) - No installation required

### macOS & Linux
Builds are available but **untested**. Windows is the primary supported platform.

## 🚀 Getting Started

1. Download and run the installer
2. Complete the setup wizard
3. Configure your blocked and allowed keywords
4. Set your focus time window
5. Choose Active or Strict mode
6. Start focusing! 🎯

## 📋 Requirements

- **Windows 10/11** (fully supported)
- Administrator privileges (for process management)
- Node.js 16+ (only if building from source)

## 🐛 Known Issues

- macOS and Linux support is experimental and untested
- Some system processes cannot be closed (by design)
- Administrator privileges required for force-close functionality

## 📝 Documentation

- [README.md](https://github.com/arif-aygun/midnight-guardian/blob/main/README.md) - Full documentation
- [CHANGELOG.md](https://github.com/arif-aygun/midnight-guardian/blob/main/CHANGELOG.md) - Detailed changes
- [Release Process](https://github.com/arif-aygun/midnight-guardian/blob/main/docs/RELEASE.md) - For maintainers

## 🤝 Contributing

Contributions are welcome! Please check the [README](https://github.com/arif-aygun/midnight-guardian/blob/main/README.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](https://github.com/arif-aygun/midnight-guardian/blob/main/LICENSE) file.

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [Node.js](https://nodejs.org/) - Runtime environment
- [active-win](https://www.npmjs.com/package/active-win) - Window tracking
- [node-notifier](https://www.npmjs.com/package/node-notifier) - System notifications
- [node-schedule](https://www.npmjs.com/package/node-schedule) - Task scheduling

---

**Sleep well. Work better. Live healthier.** 🌙

## 📊 Full Changelog

See [CHANGELOG.md](https://github.com/arif-aygun/midnight-guardian/blob/main/CHANGELOG.md) for complete details.
