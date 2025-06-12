const nextJest = require("next/jest");
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('ts-jest').JestConfigWithTsJest} */
const customConfig = {
  preset: "ts-jest",
  testEnvironment: "node",              // ← run in Node, not jsdom
  moduleFileExtensions: ["ts","tsx","js","jsx","json","node"],
  moduleNameMapper: {
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/prisma/(.*)$": "<rootDir>/prisma/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": "ts-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(next-auth|jose|openid-client)/)"
  ],
  globalSetup: "<rootDir>/tests/setup/global-setup.js",
  globalTeardown: "<rootDir>/tests/setup/global-teardown.js",
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest-setup.ts"],
};

module.exports = createJestConfig(customConfig);