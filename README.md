# 🌙 Midnight Guardian

> Smart distraction blocker for Windows that helps you maintain healthy digital habits and protect your sleep schedule.

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://www.microsoft.com/windows)

> **⚠️ Platform Support:** Currently supports **Windows only**. macOS and Linux support planned for future releases.

## ✨ Features

### ⚡ Focus Mode
- **Three monitoring modes**:
  - **Off** (⏸️) - Monitoring paused, app runs in background
  - **Active** (⚡) - Progressive warnings before force-closing apps (3 warnings)
  - **Strict** (🔒) - Immediate force-close without warnings
- **Custom time windows** - Set start and end times for monitoring
- **Real-time enforcement** - Monitors active windows every 7 seconds

### 🛑 Smart Blocking System
- **Keyword-based blocking** - Block apps/sites by window title keywords
- **Allow keywords override** - Whitelist specific keywords for exceptions
- **Progressive warnings** - 3 chances before force-closing (Active mode only)
- **Instant enforcement** - No warnings in Strict mode

### 💤 Shutdown Options
- **Shutdown at End Time** - Auto-shutdown when focus time window ends
- **Scheduled Shutdown** - Daily shutdown at specific time (works independently)
- **60-second countdown** - Warning timer before shutdown executes

### � Rules Management
- **BLOCKED Keywords** - Apps/sites to block (shown in red)
- **ALLOWED Keywords** - Override blocks for productive content (shown in green)
- **Easy management** - Add/remove keywords with simple UI

### ⚙️ System Integration
- **System tray** - Minimizes to tray, always accessible
- **Run on Startup** - Launch automatically when Windows starts
- **Persistent config** - Settings saved to `AppData/Roaming/Midnight Guardian`

## 📥 Download

### Option 1: Download Installer (Recommended)

Download the latest version for Windows:

[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue?style=for-the-badge&logo=windows)](https://github.com/arif-aygun/midnight-guardian/releases/latest)

**Windows**: Download `.exe` installer  

> **Note:** macOS and Linux builds available but untested. Windows is fully supported.

### Option 2: Build from Source

See [Quick Start](#-quick-start) below.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16 or higher ([Download](https://nodejs.org/))
- **Windows** 10/11
- **Administrator privileges** (for process management)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arif-aygun/midnight-guardian.git
   cd midnight-guardian
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **First run**:
   - Setup wizard guides you through initial configuration
   - App appears in system tray (bottom-right)
   - Click tray icon to open dashboard

## 📖 Usage Guide

### Dashboard Overview

The dashboard has 4 main sections:

1. **⚡ Focus Mode** 
   - Choose Off/Active/Strict mode
   - Set monitoring time window (e.g., 09:00 - 17:00)
   - Edit button (✎) to change times

2. **💤 Shutdown Options**
   - ☑️ Shutdown PC at End Time
   - ☑️ Scheduled Shutdown with time picker

3. **📜 Rules**
   - **BLOCKED** - Keywords to block (red chips)
   - **ALLOWED** - Exception keywords (green chips)
   - Click **+** to add new keywords

4. **⚙️ System**
   - ☑️ Run on Startup

### How It Works

**Priority System:**
1. **Whitelist** (hardcoded processes like VS Code) - Never blocked
2. **Allowed Keywords** - If window title contains allowed keyword, always allow
3. **Blocked Keywords** - If window title contains blocked keyword, block it

**Example:**
```
Window Title: "YouTube - Python Programming Tutorial"
Blocked Keywords: youtube
Allowed Keywords: tutorial, programming

Result: ✅ ALLOWED (allowed keyword overrides block)
```

### Configuration Examples

#### Example 1: Block Entertainment During Work
```
Focus Mode: Active (09:00 - 17:00)
Blocked: youtube, netflix, reddit, tiktok, game
Allowed: tutorial, documentation
```
**What happens:** Work mode from 9 AM to 5 PM. YouTube/Netflix blocked unless it's a tutorial.

#### Example 2: Strict Gaming Blocker
```
Focus Mode: Strict (08:00 - 22:00)
Blocked: steam, game, league, valorant, minecraft
Allowed: (none)
```
**What happens:** Games instantly closed all day without warnings.

#### Example 3: Bedtime Enforcement
```
Focus Mode: Active (All day: 00:00 - 23:59)
Scheduled Shutdown: 23:00 (11:00 PM)
Blocked: youtube, netflix, game, twitch
Allowed: work
```
**What happens:** PC shuts down at 11 PM every night. Entertainment blocked all day.

## ⚙️ Configuration Reference

### Focus Modes

| Mode | Icon | Behavior |
|------|------|----------|
| **Off** | ⏸️ | Monitoring disabled |
| **Active** | ⚡ | 3 warnings before force-close |
| **Strict** | 🔒 | Immediate force-close |

### Default Keywords

**BLOCKED** (Default):  
`youtube`, `facebook`, `instagram`, `twitter`, `reddit`, `tiktok`, `netflix`, `game`, `steam`, `twitch`

**ALLOWED** (Default):  
`work`, `study`, `tutorial`, `documentation`, `course`, `learn`, `education`

### Advanced Settings

These are stored in config and can be customized:

| Setting | Description | Default |
|---------|-------------|---------|
| `checkIntervalSeconds` | Seconds between active window checks | `7` |
| `warningIntervalSeconds` | Seconds between warnings | `10` |
| `autoCloseAfterWarnings` | Warnings before force-close (Active mode) | `3` |
| `shutdownCountdown` | Warning time before shutdown | `60s` |

**Warning:** These must be edited manually in:  
`%APPDATA%\Midnight Guardian\config.json`

## 🏗️ Project Structure

```
midnight-guardian/
├── src/
│   ├── main/
│   │   ├── main.js          # Electron main process, window management
│   │   ├── monitor.js       # Active window tracking & blocking
│   │   ├── overlay.js       # Warning overlay system
│   │   └── store.js         # Configuration storage (JSON)
│   ├── public/
│   │   ├── index.html       # Dashboard UI
│   │   ├── setup.html       # First-run setup wizard
│   │   ├── overlay.html     # Warning overlay
│   │   ├── script.js        # Dashboard logic
│   │   └── styles.css       # Dark theme styling
│   └── preload.js           # Secure IPC bridge
├── build/                   # App icons (.ico, .icns, .png)
├── package.json             # Dependencies & build config
└── README.md
```

## 🛠️ Development

### Running in Development

```bash
npm install
npm start
```

### Building Installers

```bash
# Build for Windows
npm run dist -- --win

# Build for all platforms
npm run dist
```

See [docs/RELEASE.md](docs/RELEASE.md) for detailed build instructions.

## 🐛 Troubleshooting

### App not blocking anything?
1. Check if Focus Mode is **Active** or **Strict** (not Off)
2. Verify current time is **within monitoring window**
3. Check if keyword exists in BLOCKED list
4. Review activity logs (click **Logs** button)

### Warnings not appearing?
- **Windows Focus Assist** might be blocking notifications
- Check Windows notification settings
- Ensure Do Not Disturb is off

### Force close not working?
- Run app as **Administrator**
- Some system processes can't be closed
- Check if app is in hardcoded whitelist (VS Code, etc.)

### App won't start?
- Verify Node.js 16+ is installed
- Delete `node_modules` and run `npm install`
- Check console for error messages

### Configuration not saving?
- Ensure `%APPDATA%\Midnight Guardian` folder is writable
- Check file permissions
- Try running as Administrator

## 📚 Documentation

### Copilot Review Documentation (Updated)
Comprehensive documentation for addressing code review comments from the Electron migration PR:

- **[COPILOT_REVIEW_INDEX.md](./COPILOT_REVIEW_INDEX.md)** - Start here for an overview
- **[PR4_REVIEW_SUMMARY.md](./PR4_REVIEW_SUMMARY.md)** - Executive summary with **revised priorities**
- **[COPILOT_REVIEW_SOLUTIONS.md](./COPILOT_REVIEW_SOLUTIONS.md)** - Detailed technical solutions

**Important Update:** After reassessing for local desktop app context, **all documented issues can be safely postponed**. Security vulnerabilities that are critical for web apps have much lower risk for local applications.

**Bottom line:** 🎯 **Ship the desktop app now. Don't delay for these issues.** ✅

These documents cover:
- 🟡 Security issues (reassessed as low-risk for local apps)
- 🟢 Functional improvements (fix if users report problems)
- 🟢 Code quality (nice-to-have, not need-to-have)
- 📋 When to revisit (cloud sync, multi-user, app store submission)

**Note:** Issues are real and solutions are documented, but priority is **low** for local desktop applications.

## 🤝 Contributing

Contributions welcome! Here's how:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

**For security fixes:** Please review [COPILOT_REVIEW_SOLUTIONS.md](./COPILOT_REVIEW_SOLUTIONS.md) for documented issues and their solutions. Note that for a local desktop app, these are lower priority than for web applications.

## 📝 License

MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/) and [Node.js](https://nodejs.org/)
- Window tracking: [active-win](https://www.npmjs.com/package/active-win)
- Notifications: [node-notifier](https://www.npmjs.com/package/node-notifier)
- Scheduling: [node-schedule](https://www.npmjs.com/package/node-schedule)

## 💡 Tips for Success

1. **Start with Active mode** - Get used to warnings before going Strict
2. **Add exceptions** - Use ALLOWED keywords for productive content
3. **Set realistic hours** - Don't block yourself all day
4. **Review logs** - Check what's being blocked and adjust
5. **Test your rules** - Make sure keywords work as expected

## 🌟 Roadmap

- [ ] Cross-platform support (macOS, Linux)
- [ ] Process blocklist/whitelist management UI
- [ ] Scheduled profiles (weekday/weekend modes)
- [ ] Screen time statistics
- [ ] Focus session timer with breaks
- [ ] Browser extension integration

---

<p align="center">
  <strong>Sleep well. Work better. Live healthier.</strong>
</p>
