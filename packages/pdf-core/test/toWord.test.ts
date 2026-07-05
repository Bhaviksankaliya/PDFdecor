import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { pdfToWord, PdfOperationError } from "../src/index.js";

async function makeTextPdf(pages: string[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([400, 600]);
    let y = 560;
    for (const line of lines) {
      page.drawText(line, { x: 40, y, size: 14, font });
      y -= 24;
    }
  }
  return doc.save();
}

test("pdfToWord produces a valid .docx containing the PDF text", async () => {
  const pdf = await makeTextPdf([["Hello World", "Second line of text"]]);
  const docx = await pdfToWord(pdf);

  // .docx is a zip whose word/document.xml holds the body text.
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("Hello World"), "expected extracted text in document.xml");
  assert.ok(xml.includes("Second line"), "expected second line in document.xml");
  // OOXML zips start with PK.
  assert.equal(docx[0], 0x50);
  assert.equal(docx[1], 0x4b);
});

test("pdfToWord keeps text from multiple pages", async () => {
  const pdf = await makeTextPdf([["Page one content"], ["Page two content"]]);
  const zip = await JSZip.loadAsync(await pdfToWord(pdf));
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("Page one content"));
  assert.ok(xml.includes("Page two content"));
});

test("pdfToWord rejects a PDF with no extractable text", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]); // blank, no text
  await assert.rejects(
    () => doc.save().then((b) => pdfToWord(b)),
    (e: unknown) => e instanceof PdfOperationError && e.code === "NO_TEXT",
  );
});
