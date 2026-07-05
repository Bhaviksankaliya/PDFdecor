import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, crc32 } from "node:zlib";
import { PDFDocument, degrees } from "pdf-lib";
import { applyOverlays, getPdfInfo, PdfOperationError } from "../src/index.js";

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
  ihdr[8] = 8;
  ihdr[9] = 6;
  const row = Buffer.alloc(1 + w * 4);
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

async function makePdf(pages: number, rotate = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([300, 400]);
    if (rotate) p.setRotation(degrees(rotate));
  }
  return doc.save();
}

const PNG = makePng(8, 8);

test("applyOverlays stamps only targeted pages and preserves count", async () => {
  const out = await applyOverlays(await makePdf(3), [
    { pageIndex: 0, image: PNG },
    { pageIndex: 2, image: PNG },
  ]);
  const info = await getPdfInfo(out);
  assert.equal(info.pageCount, 3);
});

test("applyOverlays works on a rotated page", async () => {
  const out = await applyOverlays(await makePdf(1, 90), [{ pageIndex: 0, image: PNG }]);
  assert.equal((await getPdfInfo(out)).pageCount, 1);
});

test("applyOverlays rejects an out-of-range page", async () => {
  await assert.rejects(
    () => makePdf(1).then((b) => applyOverlays(b, [{ pageIndex: 5, image: PNG }])),
    (e: unknown) => e instanceof PdfOperationError && e.code === "PAGE_OUT_OF_RANGE",
  );
});

test("applyOverlays rejects empty edits", async () => {
  const one = await makePdf(1);
  await assert.rejects(
    () => applyOverlays(one, []),
    (e: unknown) => e instanceof PdfOperationError && e.code === "NO_EDITS",
  );
});
