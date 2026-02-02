# 🌙 Midnight Guardian

> Smart distraction blocker for Windows that helps you maintain healthy digital habits and protect your sleep schedule.

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://www.microsoft.com/windows)

## ✨ Features

### 🎯 Active Monitoring
- **Real-time window tracking** - Monitors your active applications and browser tabs
- **Smart keyword filtering** - Blocks distracting content based on window titles
- **Allow/Block lists** - Fine-grained control over what gets blocked
- **Progressive warnings** - Gives you multiple chances before force-closing apps
- **Time-based scheduling** - Only monitors during specified hours

### 🌙 Midnight Check
- **Automatic bedtime enforcement** - Helps you stick to your sleep schedule
- **Customizable time windows** - Set your monitoring period (e.g., 8 PM - 11 PM)
- **Optional shutdown** - Can automatically shut down your PC at bedtime
- **Countdown warnings** - Gives you time to save your work before shutdown

### 🚫 Intelligent Blocking
- **Keyword-based blocking** - Block content with keywords like "youtube", "game", "reddit"
- **Process-level blocking** - Block specific applications (e.g., steam.exe, games)
- **Domain blocking** - Block distracting websites and services
- **Whitelist support** - Never block productive apps (VS Code, Notion, etc.)
- **Context-aware** - Allows productive content even on blocked platforms

### 🎨 Modern Web Dashboard
- **Real-time monitoring status** - See what's happening right now
- **Live activity logs** - Track all blocking events with timestamps
- **Easy configuration** - Manage all settings from a beautiful web interface
- **Instant updates** - Changes take effect immediately without restart

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16 or higher ([Download](https://nodejs.org/))
- **Windows** 10/11
- **Administrator privileges** (for process management)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/midnight-guardian.git
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

4. **Open the dashboard**
   - Navigate to `http://localhost:3000` in your browser
   - Configure your settings and start monitoring!

## 📖 Usage Guide

### Basic Setup

1. **Open Dashboard** at `http://localhost:3000`
2. Go to **⚙️ Configuration** tab
3. Add your block keywords (e.g., "youtube", "facebook", "game")
4. Add allow keywords for productive content (e.g., "tutorial", "work")
5. Go to **🔧 Settings** tab
6. Enable **Active Monitoring** and set your time window
7. Click **💾 Save Configuration**
8. Click **▶️ Start Monitoring**

### Configuration Examples

#### 🎓 Student Mode (Focus During Study Hours)
```
Active Monitoring: 9:00 AM - 6:00 PM
Block Keywords: youtube, facebook, instagram, twitter, reddit, game
Allow Keywords: tutorial, course, study, documentation, learn
Whitelist: code.exe, notion.exe, obsidian.exe
```

#### 💼 Work Mode (Productivity Hours)
```
Active Monitoring: 8:00 AM - 5:00 PM
Block Keywords: social, game, entertainment, stream
Allow Keywords: work, meeting, documentation
Blocklist: steam.exe, discord.exe, spotify.exe
Whitelist: slack.exe, teams.exe, code.exe
```

#### 😴 Sleep Mode (Enforce Bedtime)
```
Midnight Check: 10:00 PM - 11:00 PM
Enable Shutdown: Yes
Use Midnight Check Times: ✓
Block Keywords: youtube, netflix, game, social
```

### Priority System

The app uses this priority order:

1. **🟢 Whitelist** (Highest) - Never blocked, always allowed
2. **🟢 Allow Keywords** - Overrides block keywords
3. **🔴 Blocklist** - Always blocked, no exceptions
4. **🔴 Block Keywords** - Blocked unless allow keyword present

#### Example Scenarios

**Scenario 1: YouTube for Learning**
```
Window: "YouTube - Python Programming Tutorial"
Block Keywords: ["youtube"]
Allow Keywords: ["tutorial", "programming"]
Result: ✅ ALLOWED (allow keyword overrides block)
```

**Scenario 2: Gaming During Work**
```
Window: "Steam - Counter Strike"
Blocklist: ["steam.exe"]
Time: 2:00 PM (within work hours)
Result: ❌ BLOCKED (blocklist + within monitoring window)
```

**Scenario 3: VS Code Always Safe**
```
Window: "Visual Studio Code - YouTube.js"
Whitelist: ["code.exe"]
Block Keywords: ["youtube"]
Result: ✅ ALLOWED (whitelist has highest priority)
```

## ⚙️ Configuration Reference

### Active Monitoring

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Enable/disable active monitoring | `true` |
| **Start Time** | When monitoring begins | `00:00` |
| **End Time** | When monitoring ends | `23:59` |
| **Check Interval** | Seconds between checks | `7` |
| **Warning Interval** | Seconds between warnings | `10` |
| **Max Warnings** | Warnings before force close | `3` |
| **Use Midnight Check Times** | Sync with bedtime schedule | `false` |

### Midnight Check

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Enable/disable midnight check | `false` |
| **Start Time** | Monitoring period begins | `20:00` |
| **End Time** | Bedtime / Shutdown time | `23:00` |
| **Enable Shutdown** | Auto-shutdown at end time | `false` |
| **Countdown** | Warning seconds before shutdown | `10` |

### Block Keywords (Default)
`youtube`, `facebook`, `instagram`, `twitter`, `reddit`, `tiktok`, `netflix`, `game`, `steam`, `twitch`

### Allow Keywords (Default)
`work`, `study`, `tutorial`, `documentation`, `course`, `learn`, `education`

### Blocklist (Default)
- **Processes**: `steam.exe`, `epicgameslauncher.exe`, `riotclientservices.exe`, `leagueclient.exe`
- **Domains**: `youtube.com`, `facebook.com`, `instagram.com`, `twitter.com`, `reddit.com`, `tiktok.com`

### Whitelist (Default)
- **Processes**: `code.exe`, `devenv.exe`, `idea64.exe`, `sublime_text.exe`, `notion.exe`
- **Domains**: `github.com`, `stackoverflow.com`, `developer.mozilla.org`, `docs.microsoft.com`, `leetcode.com`

## 🏗️ Project Structure

```
midnight-guardian/
├── src/
│   ├── index.js          # Main application logic & monitoring
│   ├── server.js         # Express server & API endpoints
│   ├── config.js         # Default configuration
│   ├── state.json        # Runtime state storage
│   └── public/
│       ├── index.html    # Dashboard UI
│       ├── script.js     # Frontend logic
│       └── styles.css    # Modern dark theme
├── package.json          # Dependencies & scripts
└── README.md            # Documentation
```

## 🔌 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Web dashboard |
| `GET` | `/api/config` | Get current configuration |
| `POST` | `/api/config` | Update configuration |
| `GET` | `/api/status` | Get monitoring status |
| `POST` | `/api/start` | Start monitoring |
| `POST` | `/api/stop` | Pause monitoring |
| `GET` | `/api/logs/stream` | SSE stream for real-time logs |
| `POST` | `/api/logs/clear` | Clear activity logs |

### Example API Usage

```javascript
// Get current config
fetch('http://localhost:3000/api/config')
  .then(res => res.json())
  .then(config => console.log(config));

// Start monitoring
fetch('http://localhost:3000/api/start', { method: 'POST' });

// Update config
fetch('http://localhost:3000/api/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    activeMonitoring: {
      enabled: true,
      startTime: '09:00',
      endTime: '18:00'
    }
  })
});
```

## 🛠️ Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev
```

### Running in Production Mode

```bash
# Normal start
npm start
```

## 🐛 Troubleshooting

### App not blocking anything?
- Check if monitoring is **started** (green status in dashboard)
- Verify **Active Monitoring is enabled** in Settings
- Ensure current time is **within monitoring window**
- Check logs tab for "Outside monitoring window" messages

### Warnings not appearing?
- Make sure **Do Not Disturb is OFF** in Windows
- Check if PowerShell can show notifications
- Verify app has necessary permissions

### Force close not working?
- Run the app as **Administrator**
- Some system processes cannot be closed
- Check if process is in whitelist

### Configuration not saving?
- Check browser console (F12) for errors
- Verify `state.json` file is writable
- Try restarting the application

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

Contributions are welcome! Here's how:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**For security fixes:** Please review [COPILOT_REVIEW_SOLUTIONS.md](./COPILOT_REVIEW_SOLUTIONS.md) for documented issues and their solutions. Note that for a local desktop app, these are lower priority than for web applications.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/)
- Window tracking powered by [active-win](https://www.npmjs.com/package/active-win)
- Notifications via [node-notifier](https://www.npmjs.com/package/node-notifier)

## 💡 Tips for Success

1. **Start Small** - Begin with a few keywords and adjust
2. **Be Specific** - Use precise keywords for better filtering
3. **Use Whitelist** - Protect your productivity apps
4. **Review Logs** - Check what's being blocked and adjust
5. **Set Realistic Hours** - Don't over-restrict yourself
6. **Gradual Enforcement** - Increase strictness over time

## 🌟 Future Plans

- [ ] Transition to desktop app
- [ ] Multi-monitor support
- [ ] Scheduled profiles (weekday/weekend)
- [ ] Screen time statistics
- [ ] Focus session timer
- [ ] Mobile companion app
- [ ] Browser extension integration

---

<p align="center">
  <strong>Sleep well. Work better. Live healthier.</strong>
</p>
