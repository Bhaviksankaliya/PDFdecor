import { degrees } from "pdf-lib";
import { loadPdf } from "./load.js";
import { PdfOperationError } from "./errors.js";

export type Overlay = {
  /** 0-based page index this overlay applies to. */
  pageIndex: number;
  /** Transparent PNG covering the page, in displayed orientation. */
  image: Uint8Array;
};

/**
 * Flatten editor overlays onto a PDF. Each overlay is a transparent PNG the
 * size of the page (as the user saw it) and is stamped to cover the whole
 * page, baking text, shapes, freehand, and images permanently into the file.
 *
 * Rotation note: pages with 0°/180° rotation are exact. 90°/270° pages are
 * handled best-effort.
 */
export async function applyOverlays(
  bytes: Uint8Array,
  overlays: Overlay[],
): Promise<Uint8Array> {
  if (!overlays.length) {
    throw new PdfOperationError("NO_EDITS", "There are no edits to apply.");
  }
  const doc = await loadPdf(bytes);
  const pages = doc.getPages();

  for (const ov of overlays) {
    const page = pages[ov.pageIndex];
    if (!page) {
      throw new PdfOperationError(
        "PAGE_OUT_OF_RANGE",
        `Edit targets page ${ov.pageIndex + 1}, which doesn't exist.`,
      );
    }
    const png = await doc.embedPng(ov.image);
    const { width: w, height: h } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;

    if (rot === 0) {
      page.drawImage(png, { x: 0, y: 0, width: w, height: h });
    } else if (rot === 180) {
      page.drawImage(png, { x: w, y: h, width: w, height: h, rotate: degrees(180) });
    } else if (rot === 90) {
      // Displayed page is h×w; rotate the stamp to match.
      page.drawImage(png, { x: w, y: 0, width: h, height: w, rotate: degrees(90) });
    } else {
      page.drawImage(png, { x: 0, y: h, width: h, height: w, rotate: degrees(270) });
    }
  }

  return doc.save();
}
