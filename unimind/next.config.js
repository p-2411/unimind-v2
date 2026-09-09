/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Pin the tracing root to this package so Next doesn't infer a workspace
  // root from stray lockfiles in parent directories.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
};

export default config;
