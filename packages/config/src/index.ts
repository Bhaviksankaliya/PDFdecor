export * from "./types.js";
export * from "./tools.js";

/** Shared limits and constants used across web + api. */
export const LIMITS = {
  /** Max upload size per file, in bytes (100 MB free tier). */
  maxFileSize: 100 * 1024 * 1024,
  /** How long uploaded + output files live before auto-deletion. */
  fileTtlMs: 2 * 60 * 60 * 1000, // 2 hours
} as const;
