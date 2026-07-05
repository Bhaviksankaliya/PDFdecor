import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";
import { loadPdf } from "./load.js";
import { PdfOperationError } from "./errors.js";

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type Rgb = { r: number; g: number; b: number };

function place(
  anchor: Anchor,
  pageW: number,
  pageH: number,
  textW: number,
  textH: number,
  margin: number,
): { x: number; y: number } {
  const [vert, horiz] = anchor.split("-") as [string, string];
  let x = margin;
  if (horiz === "center") x = (pageW - textW) / 2;
  else if (horiz === "right") x = pageW - textW - margin;
  let y = margin;
  if (vert === "middle") y = (pageH - textH) / 2;
  else if (vert === "top") y = pageH - textH - margin;
  return { x, y };
}

// ── Page numbers ────────────────────────────────────────────────
export type PageNumberOptions = {
  anchor?: Anchor;
  /** Use {n} for current page and {total} for the count. */
  format?: string;
  fontSize?: number;
  color?: Rgb;
  startAt?: number;
  margin?: number;
  /** 0-based page indices to number; defaults to all. */
  pages?: number[];
};

export async function addPageNumbers(
  bytes: Uint8Array,
  opts: PageNumberOptions = {},
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const {
    anchor = "bottom-center",
    format = "{n}",
    fontSize = 12,
    color = { r: 0, g: 0, b: 0 },
    startAt = 1,
    margin = 24,
  } = opts;
  const pages = doc.getPages();
  const total = pages.length;
  const targets = opts.pages ? new Set(opts.pages) : null;

  pages.forEach((page, i) => {
    if (targets && !targets.has(i)) return;
    const label = format
      .replace(/\{n\}/g, String(startAt + i))
      .replace(/\{total\}/g, String(total));
    const w = font.widthOfTextAtSize(label, fontSize);
    const h = font.heightAtSize(fontSize);
    const { x, y } = place(anchor, page.getWidth(), page.getHeight(), w, h, margin);
    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  });
  return doc.save();
}

// ── Watermark ───────────────────────────────────────────────────
export type TextWatermarkOptions = {
  text: string;
  fontSize?: number;
  color?: Rgb;
  opacity?: number; // 0..1
  rotation?: number; // degrees
  tile?: boolean; // repeat across the page
  anchor?: Anchor; // used when not tiling
  pages?: number[];
};

export async function addTextWatermark(
  bytes: Uint8Array,
  opts: TextWatermarkOptions,
): Promise<Uint8Array> {
  if (!opts.text?.trim()) {
    throw new PdfOperationError("NO_TEXT", "Enter watermark text.");
  }
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const {
    text,
    fontSize = 48,
    color = { r: 0.6, g: 0.6, b: 0.6 },
    opacity = 0.3,
    rotation = 45,
    tile = false,
    anchor = "middle-center",
  } = opts;
  const targets = opts.pages ? new Set(opts.pages) : null;

  doc.getPages().forEach((page, i) => {
    if (targets && !targets.has(i)) return;
    const pw = page.getWidth();
    const ph = page.getHeight();
    const draw = (x: number, y: number) =>
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotation),
      });

    if (tile) {
      const stepX = fontSize * 6;
      const stepY = fontSize * 4;
      for (let y = 0; y < ph + stepY; y += stepY) {
        for (let x = -stepX; x < pw; x += stepX) draw(x, y);
      }
    } else {
      const tw = font.widthOfTextAtSize(text, fontSize);
      const th = font.heightAtSize(fontSize);
      const { x, y } = place(anchor, pw, ph, tw, th, 24);
      draw(x, y);
    }
  });
  return doc.save();
}

/** Stamp an embedded raster image (PNG/JPG) as a watermark. */
export type ImageWatermarkOptions = {
  image: Uint8Array;
  imageType: "png" | "jpg";
  opacity?: number;
  scale?: number; // fraction of page width
  anchor?: Anchor;
  rotation?: number;
  pages?: number[];
};

export async function addImageWatermark(
  bytes: Uint8Array,
  opts: ImageWatermarkOptions,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const img =
    opts.imageType === "png"
      ? await doc.embedPng(opts.image)
      : await doc.embedJpg(opts.image);
  const { opacity = 0.3, scale = 0.5, anchor = "middle-center", rotation = 0 } = opts;
  const targets = opts.pages ? new Set(opts.pages) : null;

  doc.getPages().forEach((page, i) => {
    if (targets && !targets.has(i)) return;
    const pw = page.getWidth();
    const ph = page.getHeight();
    const w = pw * scale;
    const h = (img.height / img.width) * w;
    const { x, y } = place(anchor, pw, ph, w, h, 24);
    page.drawImage(img, { x, y, width: w, height: h, opacity, rotate: degrees(rotation) });
  });
  return doc.save();
}

// ── Crop ────────────────────────────────────────────────────────
export type CropBox = { x: number; y: number; width: number; height: number };

/** Set the crop box. Coordinates are in PDF points from the bottom-left. */
export async function cropPdf(
  bytes: Uint8Array,
  box: CropBox,
  opts: { pages?: number[] } = {},
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const targets = opts.pages ? new Set(opts.pages) : null;
  doc.getPages().forEach((page, i) => {
    if (targets && !targets.has(i)) return;
    page.setCropBox(box.x, box.y, box.width, box.height);
  });
  return doc.save();
}

export type { PDFFont };
