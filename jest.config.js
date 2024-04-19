/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["packages/**/src/*.{ts,js,jsx}"],
  coveragePathIgnorePatterns: ["jest.config.js", "/node_modules/", "/dist/"],
  moduleNameMapper: {
    "^@lib/(.*)$": "<rootDir>/lib/$1/",
  },
};
