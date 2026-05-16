/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 83,
      lines: 90,
      statements: 84,
    },
  },
  setupFiles: ["<rootDir>/test/setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
};
