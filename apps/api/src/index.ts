import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import multer from "multer";
import { z } from "zod";
import { getTool, LIMITS } from "@pdfforge/config";
import { PdfOperationError } from "@pdfforge/pdf-core";
import { config } from "./config.js";
import { storage } from "./storage.js";
import { sniffMime } from "./sniff.js";
import { SYNC_PROCESSORS, loadInputs } from "./processors.js";

const app = express();

app.use(cors({ origin: config.webOrigin }));
// Options payloads are small (uuids + numbers); 2mb leaves ample headroom.
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITS.maxFileSize },
});

/** Route async handlers' rejections into the error middleware (Express 4). */
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Upload one file. Returns a fileId. MIME is sniffed from magic bytes —
 * the client-declared type is never trusted.
 */
app.post(
  "/api/upload",
  upload.single("file"),
  wrap(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Expected a file under the `file` field." });
      return;
    }
    const bytes = new Uint8Array(file.buffer);
    const mime = sniffMime(bytes);
    if (!mime) {
      res.status(415).json({ error: "Unsupported or unrecognized file type." });
      return;
    }
    const record = await storage.put(bytes, {
      originalName: file.originalname,
      mime,
      kind: "upload",
    });
    res.json({
      fileId: record.id,
      originalName: record.originalName,
      mime: record.mime,
      size: record.size,
    });
  }),
);

const processSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(50),
  options: z.record(z.unknown()).optional().default({}),
});

/** Process a tool. Sync tools return the result file id; async tools (later) enqueue. */
app.post(
  "/api/tools/:slug/process",
  wrap(async (req, res) => {
    const slug = req.params.slug!;
    const tool = getTool(slug);
    if (!tool) {
      res.status(404).json({ error: `Unknown tool: ${slug}` });
      return;
    }

    const parsed = processSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request.", issues: parsed.error.issues });
      return;
    }
    const { fileIds, options } = parsed.data;

    if (tool.processing === "async") {
      res
        .status(501)
        .json({ error: `Tool "${slug}" runs as a background job (not yet wired).` });
      return;
    }

    const processor = SYNC_PROCESSORS[slug];
    if (!processor) {
      res.status(501).json({ error: `Tool "${slug}" is not implemented yet.` });
      return;
    }

    // Validate every input was actually uploaded and matches accepted types.
    for (const id of fileIds) {
      const rec = storage.getRecord(id);
      if (!rec) {
        res.status(404).json({ error: `File ${id} not found or expired.` });
        return;
      }
      if (!tool.accepts.includes(rec.mime)) {
        res.status(415).json({
          error: `${rec.originalName} is not an accepted type for ${tool.title}.`,
        });
        return;
      }
    }

    try {
      const inputs = await loadInputs(fileIds);
      const result = await processor(inputs, options);
      const out = await storage.put(result.bytes, {
        originalName: result.filename,
        mime: result.mime,
        kind: "output",
      });
      res.json({
        fileId: out.id,
        filename: out.originalName,
        size: out.size,
        downloadUrl: `/api/files/${out.id}/download`,
      });
    } catch (err) {
      if (err instanceof PdfOperationError) {
        res.status(422).json({ error: err.message, code: err.code });
        return;
      }
      console.error(`[process:${slug}]`, err);
      res.status(500).json({ error: "Processing failed. Please try again." });
    }
  }),
);

/** Stream a stored file for download. */
app.get(
  "/api/files/:id/download",
  wrap(async (req, res) => {
    const got = await storage.get(req.params.id!);
    if (!got) {
      res.status(404).json({ error: "File not found or expired." });
      return;
    }
    const { record, bytes } = got;
    res.setHeader("Content-Type", record.mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${record.originalName}"`,
    );
    res.setHeader("Content-Length", String(record.size));
    res.end(Buffer.from(bytes));
  }),
);

// Central error handler: friendly 413 for oversized uploads, 500 otherwise.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      error: `File exceeds the ${LIMITS.maxFileSize / 1024 / 1024} MB limit.`,
    });
    return;
  }
  console.error("[api]", err);
  res.status(500).json({ error: "Internal server error." });
});

// TTL sweep — auto-delete expired uploads + outputs (cron-worthy in prod).
// Runs once on boot (clears files orphaned by a restart) then every 10 min.
async function sweep() {
  try {
    const removed = await storage.sweepExpired(Date.now());
    if (removed > 0) console.log(`[api] swept ${removed} expired file(s)`);
  } catch (err) {
    console.error("[api] sweep failed", err);
  }
}
void sweep();
setInterval(sweep, 10 * 60 * 1000).unref();

app.listen(config.port, () => {
  console.log(`[api] PDFForge API listening on http://localhost:${config.port}`);
});
