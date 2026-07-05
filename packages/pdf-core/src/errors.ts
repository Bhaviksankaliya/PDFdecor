/** Thrown when a PDF operation fails for a user-correctable reason. */
export class PdfOperationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PdfOperationError";
    this.code = code;
  }
}
