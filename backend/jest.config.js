// backend/jest.config.js

module.exports = {
  testEnvironment:       'node',
  testMatch:             ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv:    ['./src/__tests__/setup.js'],
  collectCoverageFrom:   ['src/**/*.js', '!src/config/seedCategories.js'],
  coverageDirectory:     'coverage',
  coverageReporters:     ['text', 'lcov'],
  testTimeout:           60000,
  verbose:               true,
  forceExit:             true,
  detectOpenHandles:     true,
  moduleNameMapper: {
    '^otplib$': '<rootDir>/src/__tests__/__mocks__/otplib.js',
  },
};