import { PDFDocument } from "pdf-lib";
import { PdfOperationError } from "./errors.js";

export type MergeInput = {
  /** Raw PDF bytes, in the order they should be merged. */
  files: Uint8Array[];
};

export type MergeResult = {
  /** Merged PDF bytes. */
  bytes: Uint8Array;
  /** Total page count of the merged document. */
  pageCount: number;
};

/**
 * Merge multiple PDFs into one, preserving page order.
 * Pure function: bytes in, bytes out. No I/O.
 */
export async function mergePdfs(input: MergeInput): Promise<MergeResult> {
  if (!input.files || input.files.length < 2) {
    throw new PdfOperationError(
      "TOO_FEW_FILES",
      "Merging requires at least two PDF files.",
    );
  }

  const out = await PDFDocument.create();

  for (let i = 0; i < input.files.length; i++) {
    const bytes = input.files[i]!;
    let src: PDFDocument;
    try {
      src = await PDFDocument.load(bytes, { ignoreEncryption: false });
    } catch (err) {
      throw new PdfOperationError(
        "INVALID_PDF",
        `File #${i + 1} could not be read as a PDF${
          err instanceof Error ? `: ${err.message}` : ""
        }.`,
      );
    }
    if (src.isEncrypted) {
      throw new PdfOperationError(
        "ENCRYPTED_PDF",
        `File #${i + 1} is password-protected. Unlock it first.`,
      );
    }
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }

  const bytes = await out.save();
  return { bytes, pageCount: out.getPageCount() };
}
