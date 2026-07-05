import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, crc32 } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  parsePageSpec,
  normalizeAngle,
  splitPdf,
  removePages,
  extractPages,
  organizePdf,
  rotatePdf,
  addPageNumbers,
  addTextWatermark,
  cropPdf,
  imagesToPdf,
  getPdfInfo,
  PdfOperationError,
} from "../src/index.js";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 400]);
  return doc.save();
}

// Build a valid 8-bit RGBA PNG so pdf-lib's decoder accepts it.
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
function makePng(w: number, h: number): Uint8Array {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const row = Buffer.alloc(1 + w * 4); // filter byte 0 + black pixels
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return new Uint8Array(
    Buffer.concat([
      sig,
      pngChunk("IHDR", ihdr),
      pngChunk("IDAT", deflateSync(raw)),
      pngChunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
const PNG_2x2 = makePng(2, 2);

test("parsePageSpec handles ranges, singles, and open-ended", () => {
  assert.deepEqual(parsePageSpec("1-3,5", 10), [0, 1, 2, 4]);
  assert.deepEqual(parsePageSpec("8-", 10), [7, 8, 9]);
  assert.deepEqual(parsePageSpec("-3", 10), [0, 1, 2]);
  assert.throws(() => parsePageSpec("99", 10), PdfOperationError);
});

test("normalizeAngle snaps to 0/90/180/270", () => {
  assert.equal(normalizeAngle(90), 90);
  assert.equal(normalizeAngle(450), 90);
  assert.equal(normalizeAngle(-90), 270);
});

test("splitPdf individual yields one file per page", async () => {
  const zipBytes = await splitPdf(await makePdf(3), { kind: "individual" });
  const zip = await JSZip.loadAsync(zipBytes);
  assert.equal(Object.keys(zip.files).length, 3);
});

test("splitPdf everyN chunks correctly", async () => {
  const zipBytes = await splitPdf(await makePdf(5), { kind: "everyN", n: 2 });
  const zip = await JSZip.loadAsync(zipBytes);
  assert.equal(Object.keys(zip.files).length, 3); // 2+2+1
});

test("removePages drops the right pages", async () => {
  const out = await removePages(await makePdf(4), [1, 2]);
  assert.equal((await getPdfInfo(out)).pageCount, 2);
});

test("removePages refuses to empty the document", async () => {
  const two = await makePdf(2);
  await assert.rejects(() => removePages(two, [0, 1]), PdfOperationError);
});

test("extractPages single produces a PDF, separate produces a zip", async () => {
  const single = await extractPages(await makePdf(5), [0, 2, 4]);
  assert.equal(single.zipped, false);
  assert.equal((await getPdfInfo(single.bytes)).pageCount, 3);

  const sep = await extractPages(await makePdf(5), [0, 2], { separate: true });
  assert.equal(sep.zipped, true);
});

test("organizePdf reorders and rotates", async () => {
  const out = await organizePdf(await makePdf(3), [
    { source: 2, rotate: 90 },
    { source: 0 },
  ]);
  const info = await getPdfInfo(out);
  assert.equal(info.pageCount, 2);
  assert.equal(info.pages[0]!.rotation, 90);
});

test("rotatePdf rotates only targeted pages", async () => {
  const out = await rotatePdf(await makePdf(3), { angle: 180, pages: [1] });
  const info = await getPdfInfo(out);
  assert.equal(info.pages[0]!.rotation, 0);
  assert.equal(info.pages[1]!.rotation, 180);
});

test("addPageNumbers and watermark keep page count and produce valid PDFs", async () => {
  const numbered = await addPageNumbers(await makePdf(2), { format: "{n}/{total}" });
  assert.equal((await getPdfInfo(numbered)).pageCount, 2);
  const wm = await addTextWatermark(await makePdf(2), { text: "DRAFT", tile: true });
  assert.equal((await getPdfInfo(wm)).pageCount, 2);
});

test("cropPdf sets a crop box without error", async () => {
  const out = await cropPdf(await makePdf(1), { x: 10, y: 10, width: 100, height: 100 });
  assert.equal((await getPdfInfo(out)).pageCount, 1);
});

test("imagesToPdf builds one page per image", async () => {
  const out = await imagesToPdf([PNG_2x2, PNG_2x2], { pageSize: "a4", margin: 20 });
  assert.equal((await getPdfInfo(out)).pageCount, 2);
});
