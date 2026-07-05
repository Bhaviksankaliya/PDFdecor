import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  /** Where uploads + outputs live on local disk (dev storage driver). */
  storageDir:
    process.env.STORAGE_DIR ?? resolve(__dirname, "../../../storage"),
  /** Allowed CORS origin for the web app. */
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
} as const;
