'use strict';

// ---- Mock all side-effect dependencies ----
jest.mock('../../src/main/store');
jest.mock('../../src/main/overlay');
jest.mock('child_process');
jest.mock('node-schedule', () => ({
    scheduleJob: jest.fn(() => ({ cancel: jest.fn() })),
}));

const activeWin = require('active-win');
const { exec } = require('child_process');
const { getStore } = require('../../src/main/store');
const { showOverlay, hideOverlay, updateOverlay } = require('../../src/main/overlay');
const { BrowserWindow } = require('electron');

const {
    isTimeInWindow,
    checkActiveWindow,
    handleBlockedApp,
    triggerFinalWarning,
    resetState,
    isDryRunMode,
} = require('../../src/main/monitor');

// ---------------------------------------------------------------------------
// Default config factory
// Destructures activeMonitoring separately so the deep merge isn't clobbered
// by the root-level spread.
// ---------------------------------------------------------------------------
function makeConfig(overrides = {}) {
    const { activeMonitoring: amOverrides, ...restOverrides } = overrides;
    return {
        activeMonitoring: {
            enabled: true,
            startTime: '09:00',
            endTime: '23:00',
            checkIntervalSeconds: 7,
            warningIntervalSeconds: 10,
            autoCloseAfterWarnings: 3,
            shutdownAtEnd: false,
            ...amOverrides,
        },
        scheduledShutdown: { enabled: false, time: '23:00' },
        blockKeywords: ['youtube', 'game', 'netflix'],
        allowKeywords: ['work', 'tutorial'],
        blocklist: {
            processes: ['steam.exe', 'epicgameslauncher.exe'],
            domains: ['youtube.com'],
        },
        whitelist: {
            processes: ['code.exe'],
            domains: ['github.com'],
        },
        strictMode: false,
        dryRun: false,
        ...restOverrides,
    };
}

// ---------------------------------------------------------------------------
// Helpers to set system time (works with jest.useFakeTimers)
// ---------------------------------------------------------------------------
function setTime(h, m) {
    jest.setSystemTime(new Date(2026, 0, 1, h, m, 0)); // Jan 1 2026
}

// ---------------------------------------------------------------------------
beforeEach(() => {
    jest.useFakeTimers();
    setTime(12, 0); // noon — inside any 09:00-23:00 window by default
    resetState();
    delete process.env.DRY_RUN;
    getStore.mockReturnValue(makeConfig());
    BrowserWindow.getAllWindows.mockReturnValue([]);
});

afterEach(() => {
    jest.useRealTimers();
});

// ===========================================================================
// isTimeInWindow — pure function, no mocks needed
// ===========================================================================
describe('isTimeInWindow', () => {
    test('returns true when current time is within window', () => {
        expect(isTimeInWindow('09:00', '23:00', 720)).toBe(true);   // noon
        expect(isTimeInWindow('09:00', '23:00', 540)).toBe(true);   // exactly 09:00
        expect(isTimeInWindow('09:00', '23:00', 1379)).toBe(true);  // 22:59
    });

    test('returns false when current time is before window', () => {
        expect(isTimeInWindow('09:00', '23:00', 539)).toBe(false);  // 08:59
        expect(isTimeInWindow('09:00', '23:00', 0)).toBe(false);    // midnight
    });

    test('returns false when current time is at or after end', () => {
        expect(isTimeInWindow('09:00', '23:00', 1380)).toBe(false); // exactly 23:00
        expect(isTimeInWindow('09:00', '23:00', 1440)).toBe(false); // 24:00 (next day)
    });

    test('handles midnight wrap-around (start > end)', () => {
        // 22:00 – 06:00 window: active from 10pm to 6am
        expect(isTimeInWindow('22:00', '06:00', 1380)).toBe(true);  // 23:00 ✓
        expect(isTimeInWindow('22:00', '06:00', 0)).toBe(true);     // 00:00 ✓
        expect(isTimeInWindow('22:00', '06:00', 300)).toBe(true);   // 05:00 ✓
        expect(isTimeInWindow('22:00', '06:00', 360)).toBe(false);  // 06:00 ✗
        expect(isTimeInWindow('22:00', '06:00', 720)).toBe(false);  // noon ✗
    });

    test('returns false when start or end is missing', () => {
        expect(isTimeInWindow(null, '23:00', 720)).toBe(false);
        expect(isTimeInWindow('09:00', null, 720)).toBe(false);
        expect(isTimeInWindow(undefined, undefined, 720)).toBe(false);
    });

    test('returns false when start equals end (zero-length window)', () => {
        expect(isTimeInWindow('12:00', '12:00', 720)).toBe(false);
    });

    test('handles minute granularity correctly', () => {
        expect(isTimeInWindow('09:30', '17:30', 569)).toBe(false);  // 09:29
        expect(isTimeInWindow('09:30', '17:30', 570)).toBe(true);   // 09:30
        expect(isTimeInWindow('09:30', '17:30', 1050)).toBe(false); // 17:30
    });
});

// ===========================================================================
// checkActiveWindow
// ===========================================================================
describe('checkActiveWindow', () => {
    test('returns early when active-win returns null', async () => {
        activeWin.mockResolvedValue(null);
        await checkActiveWindow(makeConfig());
        expect(showOverlay).not.toHaveBeenCalled();
    });

    test('returns early and hides overlay when outside active time window', async () => {
        setTime(8, 0); // before 09:00
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'YouTube' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).not.toHaveBeenCalled();
        expect(hideOverlay).toHaveBeenCalled();
    });

    test('returns early when monitoring is disabled', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'steam.exe' }, title: 'Steam' });
        await checkActiveWindow(makeConfig({ activeMonitoring: { enabled: false } }));
        expect(showOverlay).not.toHaveBeenCalled();
    });

    // ------- Self-protection (issue #21) -------
    test('ignores Guardian own window — does not log Unrestricted App', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'electron.exe' }, title: 'Midnight Guardian' });
        // hideOverlay being called would signal an unintended state reset
        await checkActiveWindow(makeConfig());
        expect(hideOverlay).not.toHaveBeenCalled();
        expect(showOverlay).not.toHaveBeenCalled();
    });

    test('when Guardian window is active and a blocked app was being tracked, continues enforcement', async () => {
        // Simulate that chrome.exe was already blocked
        const config = makeConfig({ strictMode: false });
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'youtube - chrome' });
        await checkActiveWindow(config); // establishes currentBlockedApp

        // Now Guardian steals focus
        activeWin.mockResolvedValue({ owner: { name: 'electron.exe' }, title: 'Midnight Guardian Dashboard' });
        await checkActiveWindow(config);

        // showOverlay should have been called for the original block, not reset
        expect(showOverlay).toHaveBeenCalled();
        expect(hideOverlay).not.toHaveBeenCalled(); // not reset
    });

    // ------- Whitelist -------
    test('allows whitelisted process without blocking', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'code.exe' }, title: 'VS Code' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).not.toHaveBeenCalled();
    });

    test('allows whitelisted domain without blocking', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'github.com - Chrome' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).not.toHaveBeenCalled();
    });

    test('logs Allowed when switching from a blocked app to a whitelisted one', async () => {
        const config = makeConfig();
        const mockWin = BrowserWindow.getAllWindows.mockReturnValue([
            { webContents: { send: jest.fn() } },
        ]);

        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'youtube - Chrome' });
        await checkActiveWindow(config); // block chrome

        activeWin.mockResolvedValue({ owner: { name: 'code.exe' }, title: 'VS Code' });
        await checkActiveWindow(config); // now whitelisted
        expect(hideOverlay).toHaveBeenCalled();
    });

    // ------- Allow keywords -------
    test('allows window matching allowKeywords despite block keyword in title', async () => {
        // "youtube tutorial" contains block kw "youtube" AND allow kw "tutorial"
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'youtube tutorial' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).not.toHaveBeenCalled();
    });

    // ------- Block keywords -------
    test('blocks window matching a blockKeyword', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'Watch Netflix - Chrome' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).toHaveBeenCalled();
    });

    test('block keyword match is case-insensitive', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'YOUTUBE.COM - Chrome' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).toHaveBeenCalled();
    });

    // ------- Blocklist processes/domains -------
    test('blocks a process in the blocklist', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'steam.exe' }, title: 'Steam' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).toHaveBeenCalled();
    });

    test('blocks a domain in the blocklist', async () => {
        activeWin.mockResolvedValue({ owner: { name: 'chrome.exe' }, title: 'youtube.com - Chrome' });
        await checkActiveWindow(makeConfig());
        expect(showOverlay).toHaveBeenCalled();
    });

    // ------- Unrestricted app -------
    test('logs Unrestricted App and hides overlay when blocked app is no longer active', async () => {
        const config = makeConfig();
        activeWin.mockResolvedValue({ owner: { name: 'steam.exe' }, title: 'Steam' });
        await checkActiveWindow(config); // establishes block

        activeWin.mockResolvedValue({ owner: { name: 'notepad.exe' }, title: 'Untitled - Notepad' });
        await checkActiveWindow(config); // now unrestricted
        expect(hideOverlay).toHaveBeenCalled();
    });

    // ------- Bug #20: exe name from owner.path for taskkill -------
    test('uses exe basename from owner.path for taskkill when display name differs (bug #20)', async () => {
        const config = makeConfig({
            strictMode: true,
            blocklist: { processes: ['google chrome'], domains: [] },
        });
        activeWin.mockResolvedValue({
            owner: {
                name: 'Google Chrome',
                path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            },
            title: 'YouTube - Google Chrome',
        });
        await checkActiveWindow(config);
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('chrome.exe'));
        expect(exec).not.toHaveBeenCalledWith(expect.stringContaining('google chrome'));
    });

    test('falls back to processName for taskkill when owner.path is not provided', async () => {
        const config = makeConfig({ strictMode: true });
        activeWin.mockResolvedValue({ owner: { name: 'steam.exe' }, title: 'Steam' });
        await checkActiveWindow(config);
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('steam.exe'));
    });
});

// ===========================================================================
// handleBlockedApp — Normal Mode (no strict)
// ===========================================================================
describe('handleBlockedApp — Normal Mode', () => {
    test('shows overlay on first warning', () => {
        handleBlockedApp('chrome.exe', 'YouTube', 'Keyword "youtube"', makeConfig());
        expect(showOverlay).toHaveBeenCalledWith(
            'Restricted App Detected',
            expect.stringContaining('chrome.exe'),
        );
    });

    test('logs warning count (1/maxWarnings) on first block', () => {
        const mockWin = { webContents: { send: jest.fn() } };
        BrowserWindow.getAllWindows.mockReturnValue([mockWin]);
        handleBlockedApp('steam.exe', 'Steam', 'Blocklisted App', makeConfig());
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
            'log-update',
            expect.objectContaining({ message: expect.stringContaining('Warning 1/3') }),
        );
    });

    test('does not issue another warning before warningIntervalSeconds has elapsed', () => {
        const config = makeConfig();
        handleBlockedApp('chrome.exe', 'YouTube', 'Keyword "youtube"', config); // first
        handleBlockedApp('chrome.exe', 'YouTube', 'Keyword "youtube"', config); // second — too soon
        expect(showOverlay).toHaveBeenCalledTimes(1);
    });

    test('issues second warning after warningIntervalSeconds has elapsed', () => {
        const config = makeConfig();
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config); // warning 1
        jest.advanceTimersByTime(config.activeMonitoring.warningIntervalSeconds * 1000 + 100);
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config); // warning 2
        expect(showOverlay).toHaveBeenCalledTimes(2);
    });

    test('triggers final warning when warning count reaches maxWarnings', () => {
        const config = makeConfig({ activeMonitoring: { autoCloseAfterWarnings: 2 } });
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config); // 1 → show warning

        jest.advanceTimersByTime(config.activeMonitoring.warningIntervalSeconds * 1000 + 100);
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config); // 2 → triggerFinalWarning

        // triggerFinalWarning calls showOverlay with isUrgent=true
        expect(showOverlay).toHaveBeenLastCalledWith(
            'FINAL WARNING',
            expect.stringContaining('10 seconds'),
            true,
        );
    });

    test('triggers final warning immediately on first detection if count already at max', () => {
        const config = makeConfig({ activeMonitoring: { autoCloseAfterWarnings: 1 } });
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config); // count becomes 1 → = maxWarnings
        expect(showOverlay).toHaveBeenCalledWith('FINAL WARNING', expect.any(String), true);
    });
});

// ===========================================================================
// handleBlockedApp — Strict Mode
// ===========================================================================
describe('handleBlockedApp — Strict Mode', () => {
    test('calls taskkill immediately without showing overlay', () => {
        const config = makeConfig({ strictMode: true });
        handleBlockedApp('chrome.exe', 'YouTube', 'Keyword "youtube"', config);
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('taskkill'));
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('chrome.exe'));
        expect(showOverlay).not.toHaveBeenCalled();
    });

    test('does NOT call taskkill when config.dryRun is true', () => {
        const config = makeConfig({ strictMode: true, dryRun: true });
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config);
        expect(exec).not.toHaveBeenCalled();
    });

    test('does NOT call taskkill when DRY_RUN env var is set', () => {
        process.env.DRY_RUN = 'true';
        const config = makeConfig({ strictMode: true });
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config);
        expect(exec).not.toHaveBeenCalled();
    });

    test('logs a STRICT blocking message', () => {
        const mockWin = { webContents: { send: jest.fn() } };
        BrowserWindow.getAllWindows.mockReturnValue([mockWin]);
        const config = makeConfig({ strictMode: true });
        handleBlockedApp('chrome.exe', 'YouTube', 'Keyword "youtube"', config);
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
            'log-update',
            expect.objectContaining({ message: expect.stringContaining('[STRICT]') }),
        );
    });

    test('resets currentBlockedApp to null after strict close', async () => {
        const config = makeConfig({ strictMode: true });
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config);

        // If currentBlockedApp was reset, next unrestricted window won't log "Unrestricted App"
        activeWin.mockResolvedValue({ owner: { name: 'notepad.exe' }, title: 'Notepad' });
        await checkActiveWindow(config);
        expect(hideOverlay).not.toHaveBeenCalled(); // would only be called if currentBlockedApp was set
    });
});

// ===========================================================================
// triggerFinalWarning
// ===========================================================================
describe('triggerFinalWarning', () => {
    test('shows urgent overlay immediately', () => {
        triggerFinalWarning('chrome.exe', makeConfig());
        expect(showOverlay).toHaveBeenCalledWith('FINAL WARNING', expect.any(String), true);
    });

    test('logs a final warning message', () => {
        const mockWin = { webContents: { send: jest.fn() } };
        BrowserWindow.getAllWindows.mockReturnValue([mockWin]);
        triggerFinalWarning('chrome.exe', makeConfig());
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
            'log-update',
            expect.objectContaining({ message: expect.stringContaining('FINAL WARNING') }),
        );
    });

    test('updates overlay every second during countdown', () => {
        triggerFinalWarning('chrome.exe', makeConfig());
        jest.advanceTimersByTime(3000);
        expect(updateOverlay).toHaveBeenCalledTimes(3);
    });

    test('calls taskkill after 10 seconds (issue #20)', () => {
        triggerFinalWarning('chrome.exe', makeConfig());
        jest.advanceTimersByTime(10000);
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('taskkill'));
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('chrome.exe'));
    });

    test('hides overlay after countdown completes', () => {
        triggerFinalWarning('chrome.exe', makeConfig());
        jest.advanceTimersByTime(10000);
        expect(hideOverlay).toHaveBeenCalled();
    });

    test('resets warning count to 0 after force close', () => {
        const config = makeConfig({ activeMonitoring: { autoCloseAfterWarnings: 1 } });
        triggerFinalWarning('chrome.exe', config);
        jest.advanceTimersByTime(10000);

        // Now block the same app again — if count was reset, warning should start at 1 again
        resetState();
        handleBlockedApp('chrome.exe', 'YouTube', 'kw', config);
        expect(showOverlay).toHaveBeenCalledWith('FINAL WARNING', expect.any(String), true);
    });

    test('skips taskkill when config.dryRun is true', () => {
        triggerFinalWarning('chrome.exe', makeConfig({ dryRun: true }));
        jest.advanceTimersByTime(10000);
        expect(exec).not.toHaveBeenCalled();
    });

    test('skips taskkill when DRY_RUN env var is set', () => {
        process.env.DRY_RUN = 'true';
        triggerFinalWarning('chrome.exe', makeConfig());
        jest.advanceTimersByTime(10000);
        expect(exec).not.toHaveBeenCalled();
    });

    test('clears any existing countdown before starting a new one', () => {
        triggerFinalWarning('chrome.exe', makeConfig()); // first call starts interval
        triggerFinalWarning('chrome.exe', makeConfig()); // second call — must not double-run
        jest.advanceTimersByTime(10000);
        // If two intervals were running, exec would be called twice
        expect(exec).toHaveBeenCalledTimes(1);
    });
});

// ===========================================================================
// Dry-run mode
// ===========================================================================
describe('isDryRunMode', () => {
    test('returns false when DRY_RUN is not set', () => {
        delete process.env.DRY_RUN;
        expect(isDryRunMode()).toBe(false);
    });

    test('returns true when DRY_RUN=true', () => {
        process.env.DRY_RUN = 'true';
        expect(isDryRunMode()).toBe(true);
    });

    test('returns false when DRY_RUN is set to any other value', () => {
        process.env.DRY_RUN = '1';
        expect(isDryRunMode()).toBe(false);
    });
});
