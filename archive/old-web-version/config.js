module.exports = {
  "dryRun": true,
  "activeMonitoring": {
    "enabled": true,
    "startTime": "14:00",
    "endTime": "06:00",
    "checkIntervalSeconds": 2,
    "warningIntervalSeconds": 30,
    "autoCloseAfterWarnings": 3,
    "shutdownAtEnd": false
  },
  "scheduledShutdown": {
    "enabled": false,
    "time": "23:00"
  },

  "strictMode": false,
  "blockKeywords": [
    "youtube",
    "facebook",
    "instagram",
    "twitter",
    "reddit",
    "tiktok",
    "netflix",
    "game",
    "steam",
    "twitch",
    "notepad"
  ],
  "allowKeywords": [
    "work",
    "study",
    "tutorial",
    "documentation",
    "course",
    "learn",
    "education"
  ],
  "blocklist": {
    "processes": [
      "steam.exe",
      "epicgameslauncher.exe",
      "riotclientservices.exe",
      "leagueclient.exe",
      "notepad.exe"
    ],
    "domains": [
      "youtube.com",
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "reddit.com",
      "tiktok.com"
    ]
  },
  "whitelist": {
    "processes": [
      "code.exe",
      "devenv.exe",
      "idea64.exe",
      "sublime_text.exe",
      "notion.exe",
      "electron.exe",
      "midnight-guardian.exe"
    ],
    "domains": [
      "github.com",
      "stackoverflow.com",
      "developer.mozilla.org",
      "docs.microsoft.com",
      "leetcode.com"
    ]
  },
  "overlayPath": "C:\\Users\\arif\\Documents\\GitHub\\midnight-guardian\\src\\overlay.html",
  "soundPath": "C:\\Users\\arif\\Documents\\GitHub\\midnight-guardian\\src\\warning.mp3"
};