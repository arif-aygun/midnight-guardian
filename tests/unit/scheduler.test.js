'use strict';

jest.mock('../../src/main/store');
jest.mock('../../src/main/overlay');
jest.mock('child_process');
jest.mock('node-schedule');

const schedule = require('node-schedule');
const { exec } = require('child_process');
const { updateOverlay, hideOverlay } = require('../../src/main/overlay');
const { BrowserWindow } = require('electron');

const {
    refreshScheduler,
    initiateShutdownSequence,
    resetState,
} = require('../../src/main/monitor');

function makeConfig(overrides = {}) {
    return {
        activeMonitoring: {
            enabled: true,
            startTime: '09:00',
            endTime: '23:00',
            shutdownAtEnd: false,
            ...overrides.activeMonitoring,
        },
        scheduledShutdown: {
            enabled: false,
            time: '23:00',
            ...overrides.scheduledShutdown,
        },
        strictMode: false,
        dryRun: false,
        blockKeywords: [],
        allowKeywords: [],
        blocklist: { processes: [], domains: [] },
        whitelist: { processes: [], domains: [] },
        ...overrides,
    };
}

beforeEach(() => {
    jest.useFakeTimers();
    resetState();
    delete process.env.DRY_RUN;
    BrowserWindow.getAllWindows.mockReturnValue([]);
    schedule.scheduleJob.mockReturnValue({ cancel: jest.fn() });
    if (global.scheduledShutdownJob) delete global.scheduledShutdownJob;
});

afterEach(() => {
    jest.useRealTimers();
});

// ===========================================================================
// refreshScheduler
// ===========================================================================
describe('refreshScheduler', () => {
    test('does not schedule anything when monitoring disabled and scheduledShutdown disabled', () => {
        refreshScheduler(makeConfig());
        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    });

    test('schedules shutdownAtEnd job at endTime when enabled', () => {
        const config = makeConfig({
            activeMonitoring: { enabled: true, endTime: '22:30', shutdownAtEnd: true },
        });
        refreshScheduler(config);
        expect(schedule.scheduleJob).toHaveBeenCalledWith(
            expect.objectContaining({ hour: 22, minute: 30 }),
            expect.any(Function),
        );
    });

    test('does not schedule shutdownAtEnd when monitoring is disabled', () => {
        const config = makeConfig({
            activeMonitoring: { enabled: false, endTime: '22:30', shutdownAtEnd: true },
        });
        refreshScheduler(config);
        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    });

    test('schedules daily shutdown job when enabled', () => {
        const config = makeConfig({
            scheduledShutdown: { enabled: true, time: '23:00' },
        });
        refreshScheduler(config);
        expect(schedule.scheduleJob).toHaveBeenCalledWith(
            expect.objectContaining({ hour: 23, minute: 0 }),
            expect.any(Function),
        );
    });

    test('does not schedule daily shutdown when disabled', () => {
        const config = makeConfig({ scheduledShutdown: { enabled: false, time: '23:00' } });
        refreshScheduler(config);
        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    });

    test('does not schedule when shutdown time is invalid', () => {
        const config = makeConfig({
            scheduledShutdown: { enabled: true, time: 'bad-time' },
        });
        expect(() => refreshScheduler(config)).not.toThrow();
        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    });

    test('does not schedule shutdownAtEnd when endTime is invalid', () => {
        const config = makeConfig({
            activeMonitoring: { enabled: true, endTime: '99:99', shutdownAtEnd: true },
        });
        expect(() => refreshScheduler(config)).not.toThrow();
        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    });

    test('parses HH:MM correctly for single-digit hour', () => {
        const config = makeConfig({
            scheduledShutdown: { enabled: true, time: '7:30' },
        });
        refreshScheduler(config);
        expect(schedule.scheduleJob).toHaveBeenCalledWith(
            expect.objectContaining({ hour: 7, minute: 30 }),
            expect.any(Function),
        );
    });

    test('cancels previous global scheduledShutdownJob before creating a new one', () => {
        const cancelFn = jest.fn();
        global.scheduledShutdownJob = { cancel: cancelFn };

        const config = makeConfig({ scheduledShutdown: { enabled: true, time: '23:00' } });
        refreshScheduler(config);
        expect(cancelFn).toHaveBeenCalled();
    });

    test('cancels global scheduledShutdownJob when shutdown is disabled', () => {
        const cancelFn = jest.fn();
        global.scheduledShutdownJob = { cancel: cancelFn };

        refreshScheduler(makeConfig({ scheduledShutdown: { enabled: false } }));
        expect(cancelFn).toHaveBeenCalled();
    });
});

// ===========================================================================
// initiateShutdownSequence
// ===========================================================================
describe('initiateShutdownSequence', () => {
    test('shows timer-only overlay immediately', () => {
        initiateShutdownSequence(makeConfig(), 'Daily Scheduled Shutdown');
        expect(updateOverlay).toHaveBeenCalledWith(
            'Daily Scheduled Shutdown',
            '',
            expect.objectContaining({ mode: 'timer-only', forceShow: true }),
        );
    });

    test('logs shutdown initiation', () => {
        const mockWin = { webContents: { send: jest.fn() } };
        BrowserWindow.getAllWindows.mockReturnValue([mockWin]);
        initiateShutdownSequence(makeConfig(), 'Focus Session Ended');
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
            'log-update',
            expect.objectContaining({ message: expect.stringContaining('Focus Session Ended') }),
        );
    });

    test('calls exec shutdown after 60 seconds', () => {
        initiateShutdownSequence(makeConfig(), 'Daily Scheduled Shutdown');
        jest.advanceTimersByTime(60000);
        expect(exec).toHaveBeenCalledWith('shutdown /s /t 0');
    });

    test('skips exec shutdown in dry run mode (config.dryRun)', () => {
        initiateShutdownSequence(makeConfig({ dryRun: true }), 'Daily Scheduled Shutdown');
        jest.advanceTimersByTime(60000);
        expect(exec).not.toHaveBeenCalled();
    });

    test('skips exec shutdown in dry run mode (DRY_RUN env var)', () => {
        process.env.DRY_RUN = 'true';
        initiateShutdownSequence(makeConfig(), 'Daily Scheduled Shutdown');
        jest.advanceTimersByTime(60000);
        expect(exec).not.toHaveBeenCalled();
    });

    test('hides overlay in dry run mode after countdown', () => {
        initiateShutdownSequence(makeConfig({ dryRun: true }), 'Daily Scheduled Shutdown');
        jest.advanceTimersByTime(60000);
        expect(hideOverlay).toHaveBeenCalled();
    });

    test('updates timer every second', () => {
        initiateShutdownSequence(makeConfig(), 'Daily Scheduled Shutdown');
        jest.advanceTimersByTime(5000);
        expect(updateOverlay).toHaveBeenCalledTimes(6); // 1 initial + 5 interval ticks
    });

    test('does not call exec before 60 seconds have elapsed', () => {
        initiateShutdownSequence(makeConfig(), 'Daily Scheduled Shutdown');
        jest.advanceTimersByTime(59000);
        expect(exec).not.toHaveBeenCalled();
    });
});
