// `~/env` validates required variables at import time; the integration tests
// only need a database URL, which they read from TEST_DATABASE_URL.
process.env.SKIP_ENV_VALIDATION = "1";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must point at a migrated, throwaway PostgreSQL database",
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
