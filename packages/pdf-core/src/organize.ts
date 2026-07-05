import { PDFDocument, degrees } from "pdf-lib";
import { PdfOperationError } from "./errors.js";
import { loadPdf } from "./load.js";
import { normalizeAngle, parsePageSpec } from "./pages.js";
import { zipFiles, type ZipEntry } from "./zip.js";

/** Build a new PDF from a subset of another document's pages, in order. */
async function buildFromIndices(
  src: PDFDocument,
  indices: number[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  for (const p of copied) out.addPage(p);
  return out.save();
}

// ── Split ───────────────────────────────────────────────────────
export type SplitMode =
  | { kind: "ranges"; ranges: string[] } // each range -> one output file
  | { kind: "everyN"; n: number } // chunks of N pages
  | { kind: "individual" }; // one file per page

export async function splitPdf(
  bytes: Uint8Array,
  mode: SplitMode,
): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const total = src.getPageCount();
  const entries: ZipEntry[] = [];

  if (mode.kind === "ranges") {
    if (!mode.ranges.length) {
      throw new PdfOperationError("NO_RANGES", "Add at least one range.");
    }
    for (let i = 0; i < mode.ranges.length; i++) {
      const indices = parsePageSpec(mode.ranges[i]!, total);
      entries.push({
        name: `split_${String(i + 1).padStart(2, "0")}.pdf`,
        bytes: await buildFromIndices(src, indices),
      });
    }
  } else if (mode.kind === "everyN") {
    const n = Math.max(1, Math.floor(mode.n));
    let part = 1;
    for (let start = 0; start < total; start += n) {
      const indices = Array.from(
        { length: Math.min(n, total - start) },
        (_, k) => start + k,
      );
      entries.push({
        name: `split_${String(part++).padStart(2, "0")}.pdf`,
        bytes: await buildFromIndices(src, indices),
      });
    }
  } else {
    for (let i = 0; i < total; i++) {
      entries.push({
        name: `page_${String(i + 1).padStart(3, "0")}.pdf`,
        bytes: await buildFromIndices(src, [i]),
      });
    }
  }

  return zipFiles(entries);
}

// ── Remove pages ────────────────────────────────────────────────
export async function removePages(
  bytes: Uint8Array,
  pages: number[],
): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const total = src.getPageCount();
  const remove = new Set(pages);
  const keep = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !remove.has(i),
  );
  if (keep.length === 0) {
    throw new PdfOperationError(
      "NOTHING_LEFT",
      "You can't remove every page — at least one must remain.",
    );
  }
  return buildFromIndices(src, keep);
}

// ── Extract pages ───────────────────────────────────────────────
export async function extractPages(
  bytes: Uint8Array,
  pages: number[],
  opts: { separate?: boolean } = {},
): Promise<{ bytes: Uint8Array; zipped: boolean }> {
  const src = await loadPdf(bytes);
  if (pages.length === 0) {
    throw new PdfOperationError("NO_PAGES", "Select at least one page to extract.");
  }
  if (opts.separate) {
    const entries: ZipEntry[] = [];
    for (const i of pages) {
      entries.push({
        name: `page_${String(i + 1).padStart(3, "0")}.pdf`,
        bytes: await buildFromIndices(src, [i]),
      });
    }
    return { bytes: await zipFiles(entries), zipped: true };
  }
  return { bytes: await buildFromIndices(src, pages), zipped: false };
}

// ── Organize (reorder + rotate + delete in one pass) ────────────
export type OrganizeOp = { source: number; rotate?: number };

export async function organizePdf(
  bytes: Uint8Array,
  ops: OrganizeOp[],
): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const total = src.getPageCount();
  if (ops.length === 0) {
    throw new PdfOperationError("NOTHING_LEFT", "The document would be empty.");
  }
  for (const op of ops) {
    if (op.source < 0 || op.source >= total) {
      throw new PdfOperationError("PAGE_OUT_OF_RANGE", `Bad page index ${op.source}.`);
    }
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    ops.map((o) => o.source),
  );
  copied.forEach((page, idx) => {
    const rot = normalizeAngle(ops[idx]!.rotate ?? 0);
    if (rot) {
      const base = page.getRotation().angle;
      page.setRotation(degrees((base + rot) % 360));
    }
    out.addPage(page);
  });
  return out.save();
}

// ── Rotate ──────────────────────────────────────────────────────
export async function rotatePdf(
  bytes: Uint8Array,
  opts: { angle: number; pages?: number[] },
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const delta = normalizeAngle(opts.angle);
  const target = opts.pages ? new Set(opts.pages) : null;
  doc.getPages().forEach((page, i) => {
    if (target && !target.has(i)) return;
    const base = page.getRotation().angle;
    page.setRotation(degrees((base + delta) % 360));
  });
  return doc.save();
}
