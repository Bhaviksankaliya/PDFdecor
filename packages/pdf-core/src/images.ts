import { PDFDocument } from "pdf-lib";
import { PdfOperationError } from "./errors.js";

const PAGE_SIZES = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
} as const;

export type ImagesToPdfOptions = {
  /** "fit" makes each page match its image; otherwise a fixed sheet size. */
  pageSize?: "fit" | "a4" | "letter";
  orientation?: "portrait" | "landscape";
  /** Margin in points (ignored for "fit"). */
  margin?: number;
};

function detectImageType(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  return null;
}

/** Build a PDF from a list of JPG/PNG images, one image per page. */
export async function imagesToPdf(
  images: Uint8Array[],
  opts: ImagesToPdfOptions = {},
): Promise<Uint8Array> {
  if (!images.length) {
    throw new PdfOperationError("NO_IMAGES", "Add at least one image.");
  }
  const { pageSize = "fit", orientation = "portrait", margin = 0 } = opts;
  const doc = await PDFDocument.create();

  for (let i = 0; i < images.length; i++) {
    const bytes = images[i]!;
    const type = detectImageType(bytes);
    if (!type) {
      throw new PdfOperationError(
        "UNSUPPORTED_IMAGE",
        `Image #${i + 1} must be a JPG or PNG.`,
      );
    }
    const img = type === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

    if (pageSize === "fit") {
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      continue;
    }

    const size = PAGE_SIZES[pageSize];
    let w: number = size.w;
    let h: number = size.h;
    if (orientation === "landscape") [w, h] = [h, w];
    const page = doc.addPage([w, h]);
    const availW = w - margin * 2;
    const availH = h - margin * 2;
    const scale = Math.min(availW / img.width, availH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    page.drawImage(img, {
      x: (w - drawW) / 2,
      y: (h - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  return doc.save();
}
