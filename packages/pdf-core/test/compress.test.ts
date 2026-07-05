import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, crc32 } from "node:zlib";
import { buildRasterPdf, pickSmaller, getPdfInfo, PdfOperationError } from "../src/index.js";

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
    Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]),
  );
}

test("buildRasterPdf makes one page per image at the given point size", async () => {
  const img = makePng(20, 30);
  const out = await buildRasterPdf([
    { image: img, widthPt: 595, heightPt: 842 },
    { image: img, widthPt: 300, heightPt: 400 },
  ]);
  const info = await getPdfInfo(out);
  assert.equal(info.pageCount, 2);
  assert.equal(Math.round(info.pages[0]!.width), 595);
  assert.equal(Math.round(info.pages[1]!.height), 400);
});

test("buildRasterPdf rejects an empty page list", async () => {
  await assert.rejects(() => buildRasterPdf([]), PdfOperationError);
});

test("pickSmaller returns the smaller file and flags fallback", () => {
  const big = new Uint8Array(1000);
  const small = new Uint8Array(200);
  assert.deepEqual(pickSmaller(big, small), { bytes: small, usedOriginal: false });
  const r = pickSmaller(small, big);
  assert.equal(r.usedOriginal, true);
  assert.equal(r.bytes.byteLength, 200);
});
