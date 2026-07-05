import { PDFDocument } from "pdf-lib";
import { PdfOperationError } from "./errors.js";

/** Load a PDF, turning failures into clear, user-facing errors. */
export async function loadPdf(
  bytes: Uint8Array,
  label = "The file",
): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
  } catch (err) {
    throw new PdfOperationError(
      "INVALID_PDF",
      `${label} could not be read as a PDF${
        err instanceof Error ? `: ${err.message}` : ""
      }.`,
    );
  }
  if (doc.isEncrypted) {
    throw new PdfOperationError(
      "ENCRYPTED_PDF",
      `${label} is password-protected. Unlock it first.`,
    );
  }
  return doc;
}
