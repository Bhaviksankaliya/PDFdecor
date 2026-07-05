import { PDFDocument } from "pdf-lib";
import { PdfOperationError } from "./errors.js";

export type RasterPage = {
  /** Rendered page image bytes (JPEG or PNG). */
  image: Uint8Array;
  /** Original page size in PDF points, so geometry is preserved. */
  widthPt: number;
  heightPt: number;
};

function isPng(b: Uint8Array): boolean {
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

/**
 * Rebuild a PDF from pre-rendered page images, one image per page, each drawn
 * full-bleed at its original point size. This is the core of image-based
 * compression: the caller renders pages at a reduced DPI/quality and this
 * reassembles them into a valid PDF that keeps the original page geometry.
 */
export async function buildRasterPdf(pages: RasterPage[]): Promise<Uint8Array> {
  if (!pages.length) {
    throw new PdfOperationError("NO_PAGES", "No pages to compress.");
  }
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages.length; i++) {
    const { image, widthPt, heightPt } = pages[i]!;
    const embedded = isPng(image) ? await doc.embedPng(image) : await doc.embedJpg(image);
    const page = doc.addPage([widthPt, heightPt]);
    page.drawImage(embedded, { x: 0, y: 0, width: widthPt, height: heightPt });
  }
  return doc.save();
}

/**
 * Return whichever of two PDFs is smaller. Used so compression never yields a
 * file larger than the original (text-heavy PDFs that don't benefit from
 * rasterization simply keep their original bytes).
 */
export function pickSmaller(
  original: Uint8Array,
  candidate: Uint8Array,
): { bytes: Uint8Array; usedOriginal: boolean } {
  return candidate.byteLength < original.byteLength
    ? { bytes: candidate, usedOriginal: false }
    : { bytes: original, usedOriginal: true };
}
