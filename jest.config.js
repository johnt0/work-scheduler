/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    testTimeout: 30000,
    extensionsToTreatAsEsm: ['.ts'],
    globalSetup: './tests/setup/globalSetup.js',
    globalTeardown: './tests/setup/globalTeardown.js',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    },
};

export default config;
