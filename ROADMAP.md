# 🗺️ Product Roadmap

## 🚀 Upcoming Releases

### v1.1.0 - Process Management (Next up)
- [ ] **Process Blocklist/Whitelist UI**
  - Add "Process Names" tab in Rules section.
  - Allow blocking applications by executable name (e.g., `active-win`, `steam`) regardless of window title.
  - Visual separation between Keyword rules and Process rules.

### v1.2.0 - Platform Expansion
- [ ] **macOS Support**
  - Verify `active-win` behavior on macOS.
  - Test permission handling (Accessibility API).
  - Create DMG installer build target.
- [ ] **Linux Support**
  - Verify on Ubuntu/Fedora.
  - Test AppImage/Debian builds.

## 🔮 Future Concepts

### v2.0.0 - Analytics & Profiles
- [ ] **Focus Profiles**
  - Create named profiles (e.g., "Deep Work", "Casual Reading", "Gaming Block").
  - Schedule specific profiles for specific days/times.
- [ ] **Usage Statistics**
  - Local database to track time spent in apps.
  - Daily/Weekly visualizations of focus time vs. distraction time.

### Backlog / Experimentation
- [ ] **Browser Extension**
  - Integration to block specific URLs within browsers (requires native messaging host).
- [ ] **Focus Session Timer**
  - Pomodoro-style timer with breaks.
