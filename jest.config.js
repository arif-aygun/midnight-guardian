module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/main/monitor.js',
        'src/main/store.js',
        'src/main/overlay.js',
    ],
    coverageThreshold: {
        global: { lines: 70 },
    },
    moduleNameMapper: {
        '^electron$': '<rootDir>/tests/__mocks__/electron.js',
        '^active-win$': '<rootDir>/tests/__mocks__/active-win.js',
        '^electron-is-dev$': '<rootDir>/tests/__mocks__/electron-is-dev.js',
    },
    clearMocks: true,
};
