/**
 * Integration tests run against a real PostgreSQL given by TEST_DATABASE_URL
 * (a throwaway local instance with `prisma migrate deploy` applied).
 * They are excluded from `npm test`; run with `npm run test:integration`.
 */
/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.int.test.ts"],
  transform: {
    // `.js` is included so `src/env.js` (ESM) is converted for Jest.
    "^.+\\.[tj]sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: false },
          target: "es2022",
        },
      },
    ],
  },
  // These packages (and superjson's deps) ship ESM only; let swc convert them
  // instead of ignoring them.
  transformIgnorePatterns: [
    "/node_modules/(?!(superjson|copy-anything|is-what|@t3-oss)/)",
  ],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
    // Server-only guards and Next request APIs are not available in Jest;
    // the tests build their own tRPC context and never call these.
    "^server-only$": "<rootDir>/test/stubs/empty.ts",
    "^next/headers$": "<rootDir>/test/stubs/next-headers.ts",
  },
  setupFiles: ["<rootDir>/test/integration.setup.ts"],
  testTimeout: 30_000,
  maxWorkers: 1,
};
