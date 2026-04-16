/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: false },
          target: "es2022",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
};
