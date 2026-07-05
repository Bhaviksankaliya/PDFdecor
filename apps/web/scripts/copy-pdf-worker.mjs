// Copy the PDF.js worker into /public so the browser loads it directly
// instead of webpack trying (and failing) to bundle the minified module.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkg = dirname(require.resolve("pdfjs-dist/package.json"));
const src = join(pkg, "build", "pdf.worker.min.mjs");
const destDir = join(process.cwd(), "public");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "pdf.worker.min.mjs"));
console.log("[copy-pdf-worker] copied pdf.worker.min.mjs -> public/");
