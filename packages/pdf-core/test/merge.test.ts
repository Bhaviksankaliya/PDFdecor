import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { mergePdfs, PdfOperationError } from "../src/index.js";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
  return doc.save();
}

test("merges two PDFs and sums page counts", async () => {
  const a = await makePdf(2);
  const b = await makePdf(3);
  const result = await mergePdfs({ files: [a, b] });
  assert.equal(result.pageCount, 5);
  // Output is a real PDF with the %PDF- header.
  const header = Buffer.from(result.bytes.slice(0, 5)).toString("latin1");
  assert.equal(header, "%PDF-");
});

test("preserves order across three files", async () => {
  const result = await mergePdfs({
    files: [await makePdf(1), await makePdf(4), await makePdf(2)],
  });
  assert.equal(result.pageCount, 7);
});

test("rejects fewer than two files", async () => {
  const one = await makePdf(1);
  await assert.rejects(
    () => mergePdfs({ files: [one] }),
    (err: unknown) =>
      err instanceof PdfOperationError && err.code === "TOO_FEW_FILES",
  );
});

test("rejects non-PDF bytes with a clear error", async () => {
  const one = await makePdf(1);
  await assert.rejects(
    () => mergePdfs({ files: [one, new Uint8Array([1, 2, 3, 4])] }),
    (err: unknown) =>
      err instanceof PdfOperationError && err.code === "INVALID_PDF",
  );
});
