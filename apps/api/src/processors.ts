import { z } from "zod";
import {
  mergePdfs,
  splitPdf,
  removePages,
  extractPages,
  organizePdf,
  rotatePdf,
  addPageNumbers,
  addTextWatermark,
  addImageWatermark,
  cropPdf,
  imagesToPdf,
  applyOverlays,
  pdfToWord,
  buildRasterPdf,
  pickSmaller,
  PdfOperationError,
} from "@pdfforge/pdf-core";
import { storage } from "./storage.js";

export type ProcessOutput = {
  bytes: Uint8Array;
  filename: string;
  mime: string;
};

export type SyncProcessor = (
  inputs: Uint8Array[],
  options: Record<string, unknown>,
) => Promise<ProcessOutput>;

const PDF_MIME = "application/pdf";
const ZIP_MIME = "application/zip";

/** Parse options with a schema, surfacing a clean error on failure. */
function parseOpts<T>(schema: z.ZodType<T>, options: unknown): T {
  const r = schema.safeParse(options ?? {});
  if (!r.success) {
    throw new PdfOperationError(
      "BAD_OPTIONS",
      r.error.issues[0]?.message ?? "Invalid options.",
    );
  }
  return r.data;
}

const anchorEnum = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);
const rgbSchema = z.object({ r: z.number(), g: z.number(), b: z.number() });
const pageList = z.array(z.number().int().nonnegative()).optional();

/**
 * Sync processors keyed by tool slug. Each validates its own options, then
 * delegates to a pure `@pdfforge/pdf-core` function.
 */
export const SYNC_PROCESSORS: Record<string, SyncProcessor> = {
  "merge-pdf": async (inputs) => {
    const { bytes } = await mergePdfs({ files: inputs });
    return { bytes, filename: "merged.pdf", mime: PDF_MIME };
  },

  "split-pdf": async (inputs, options) => {
    const opts = parseOpts(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("ranges"), ranges: z.array(z.string()).min(1) }),
        z.object({ kind: z.literal("everyN"), n: z.number().int().min(1) }),
        z.object({ kind: z.literal("individual") }),
      ]),
      options,
    );
    const bytes = await splitPdf(inputs[0]!, opts);
    return { bytes, filename: "split.zip", mime: ZIP_MIME };
  },

  "remove-pages": async (inputs, options) => {
    const { pages } = parseOpts(
      z.object({ pages: z.array(z.number().int().nonnegative()).min(1) }),
      options,
    );
    const bytes = await removePages(inputs[0]!, pages);
    return { bytes, filename: "removed.pdf", mime: PDF_MIME };
  },

  "extract-pages": async (inputs, options) => {
    const opts = parseOpts(
      z.object({
        pages: z.array(z.number().int().nonnegative()).min(1),
        separate: z.boolean().optional(),
      }),
      options,
    );
    const res = await extractPages(inputs[0]!, opts.pages, { separate: opts.separate });
    return res.zipped
      ? { bytes: res.bytes, filename: "extracted.zip", mime: ZIP_MIME }
      : { bytes: res.bytes, filename: "extracted.pdf", mime: PDF_MIME };
  },

  "organize-pdf": async (inputs, options) => {
    const { ops } = parseOpts(
      z.object({
        ops: z
          .array(
            z.object({
              source: z.number().int().nonnegative(),
              rotate: z.number().optional(),
            }),
          )
          .min(1),
      }),
      options,
    );
    const bytes = await organizePdf(inputs[0]!, ops);
    return { bytes, filename: "organized.pdf", mime: PDF_MIME };
  },

  "rotate-pdf": async (inputs, options) => {
    const opts = parseOpts(
      z.object({ angle: z.number(), pages: pageList }),
      options,
    );
    // Rotate every input file, then bundle (or return the single result).
    if (inputs.length === 1) {
      const bytes = await rotatePdf(inputs[0]!, opts);
      return { bytes, filename: "rotated.pdf", mime: PDF_MIME };
    }
    const { zipFiles } = await import("@pdfforge/pdf-core");
    const entries = await Promise.all(
      inputs.map(async (b, i) => ({
        name: `rotated_${String(i + 1).padStart(2, "0")}.pdf`,
        bytes: await rotatePdf(b, opts),
      })),
    );
    return { bytes: await zipFiles(entries), filename: "rotated.zip", mime: ZIP_MIME };
  },

  "page-numbers": async (inputs, options) => {
    const opts = parseOpts(
      z.object({
        anchor: anchorEnum.optional(),
        format: z.string().optional(),
        fontSize: z.number().min(4).max(96).optional(),
        color: rgbSchema.optional(),
        startAt: z.number().int().optional(),
        margin: z.number().optional(),
        pages: pageList,
      }),
      options,
    );
    const bytes = await addPageNumbers(inputs[0]!, opts);
    return { bytes, filename: "numbered.pdf", mime: PDF_MIME };
  },

  "watermark-pdf": async (inputs, options) => {
    const opts = parseOpts(
      z.discriminatedUnion("mode", [
        z.object({
          mode: z.literal("text"),
          text: z.string().min(1, "Enter watermark text."),
          fontSize: z.number().min(8).max(200).optional(),
          color: rgbSchema.optional(),
          opacity: z.number().min(0).max(1).optional(),
          rotation: z.number().optional(),
          tile: z.boolean().optional(),
          anchor: anchorEnum.optional(),
          pages: pageList,
        }),
        z.object({
          mode: z.literal("image"),
          imageFileId: z.string().uuid(),
          imageType: z.enum(["png", "jpg"]),
          opacity: z.number().min(0).max(1).optional(),
          scale: z.number().min(0.05).max(1).optional(),
          anchor: anchorEnum.optional(),
          rotation: z.number().optional(),
          pages: pageList,
        }),
      ]),
      options,
    );

    if (opts.mode === "text") {
      const bytes = await addTextWatermark(inputs[0]!, opts);
      return { bytes, filename: "watermarked.pdf", mime: PDF_MIME };
    }

    const img = await storage.get(opts.imageFileId);
    if (!img) throw new PdfOperationError("NO_IMAGE", "Watermark image not found.");
    const bytes = await addImageWatermark(inputs[0]!, {
      image: img.bytes,
      imageType: opts.imageType,
      opacity: opts.opacity,
      scale: opts.scale,
      anchor: opts.anchor,
      rotation: opts.rotation,
      pages: opts.pages,
    });
    return { bytes, filename: "watermarked.pdf", mime: PDF_MIME };
  },

  "crop-pdf": async (inputs, options) => {
    const opts = parseOpts(
      z.object({
        box: z.object({
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
        }),
        pages: pageList,
      }),
      options,
    );
    const bytes = await cropPdf(inputs[0]!, opts.box, { pages: opts.pages });
    return { bytes, filename: "cropped.pdf", mime: PDF_MIME };
  },

  "jpg-to-pdf": async (inputs, options) => {
    const opts = parseOpts(
      z.object({
        pageSize: z.enum(["fit", "a4", "letter"]).optional(),
        orientation: z.enum(["portrait", "landscape"]).optional(),
        margin: z.number().min(0).max(200).optional(),
      }),
      options,
    );
    const bytes = await imagesToPdf(inputs, opts);
    return { bytes, filename: "images.pdf", mime: PDF_MIME };
  },

  "scan-to-pdf": async (inputs, options) => {
    const opts = parseOpts(
      z.object({
        pageSize: z.enum(["fit", "a4", "letter"]).optional(),
        orientation: z.enum(["portrait", "landscape"]).optional(),
        margin: z.number().min(0).max(200).optional(),
      }),
      options,
    );
    const bytes = await imagesToPdf(inputs, { pageSize: "a4", ...opts });
    return { bytes, filename: "scan.pdf", mime: PDF_MIME };
  },

  "edit-pdf": (inputs, options) => flattenOverlays(inputs, options, "edited.pdf"),

  "sign-pdf": (inputs, options) => flattenOverlays(inputs, options, "signed.pdf"),

  "pdf-to-word": async (inputs) => {
    const bytes = await pdfToWord(inputs[0]!);
    return {
      bytes,
      filename: "converted.docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  },

  "compress-pdf": async (inputs, options) => {
    const { pages } = parseOpts(
      z.object({
        pages: z
          .array(
            z.object({
              imageFileId: z.string().uuid(),
              widthPt: z.number().positive(),
              heightPt: z.number().positive(),
            }),
          )
          .min(1),
      }),
      options,
    );
    const raster = await Promise.all(
      pages.map(async (p) => {
        const img = await storage.get(p.imageFileId);
        if (!img) throw new PdfOperationError("NO_PAGE", "A rendered page expired. Try again.");
        return { image: img.bytes, widthPt: p.widthPt, heightPt: p.heightPt };
      }),
    );
    const rebuilt = await buildRasterPdf(raster);
    // Never hand back something bigger than the original.
    const { bytes } = pickSmaller(inputs[0]!, rebuilt);
    return { bytes, filename: "compressed.pdf", mime: PDF_MIME };
  },
};

/**
 * Shared overlay-flatten pipeline: resolve per-page overlay images and stamp
 * them onto the PDF. Powers both edit-pdf and sign-pdf.
 */
async function flattenOverlays(
  inputs: Uint8Array[],
  options: Record<string, unknown>,
  filename: string,
): Promise<ProcessOutput> {
  const { overlays } = parseOpts(
    z.object({
      overlays: z
        .array(
          z.object({
            pageIndex: z.number().int().nonnegative(),
            imageFileId: z.string().uuid(),
          }),
        )
        .min(1, "Add at least one change before applying."),
    }),
    options,
  );
  const resolved = await Promise.all(
    overlays.map(async (o) => {
      const img = await storage.get(o.imageFileId);
      if (!img) throw new PdfOperationError("NO_OVERLAY", "A layer expired. Try again.");
      return { pageIndex: o.pageIndex, image: img.bytes };
    }),
  );
  const bytes = await applyOverlays(inputs[0]!, resolved);
  return { bytes, filename, mime: PDF_MIME };
}

/** Resolve a list of uploaded file ids to their byte contents, in order. */
export async function loadInputs(fileIds: string[]): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for (const id of fileIds) {
    const got = await storage.get(id);
    if (!got) throw new Error(`Uploaded file ${id} not found or expired.`);
    out.push(got.bytes);
  }
  return out;
}
