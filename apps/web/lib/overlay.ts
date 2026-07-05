/** Convert a PNG data URL into a File for upload. */
export function dataUrlToFile(dataUrl: string, name: string): File {
  const [, b64] = dataUrl.split(",");
  const bin = atob(b64!);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: "image/png" });
}

/**
 * Extract only the ink from a photographed/scanned signature, removing the
 * background entirely — including off-white paper, shadows, and uneven
 * lighting.
 *
 * How: estimate the local background by heavily blurring the image, then keep
 * pixels that are meaningfully darker than their own surroundings (ratio of
 * luminance to blurred luminance). Shadows and paper tint match their local
 * background, so they vanish; pen strokes don't, so they stay. Finishes with
 * a soft alpha ramp (anti-aliased edges) and a despeckle pass.
 */
export async function extractInk(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const bctx = base.getContext("2d", { willReadFrequently: true })!;
  bctx.drawImage(img, 0, 0, w, h);

  // Local background estimate: a strong blur of the image itself.
  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const blctx = blurred.getContext("2d", { willReadFrequently: true })!;
  blctx.filter = `blur(${Math.max(8, Math.round(Math.max(w, h) / 40))}px)`;
  blctx.drawImage(img, 0, 0, w, h);

  const src = bctx.getImageData(0, 0, w, h);
  const bg = blctx.getImageData(0, 0, w, h);
  const p = src.data;
  const q = bg.data;
  const lum = (d: Uint8ClampedArray, i: number) =>
    0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;

  // Alpha from local darkness: <=HARD fully ink, >=SOFT fully background.
  const HARD = 0.62;
  const SOFT = 0.88;
  const mask = new Uint8Array(w * h);
  for (let i = 0, px = 0; i < p.length; i += 4, px++) {
    if (p[i + 3]! < 16) continue; // already-transparent source pixels
    const ratio = lum(p, i) / Math.max(1, lum(q, i));
    if (ratio <= HARD) mask[px] = 255;
    else if (ratio < SOFT) mask[px] = Math.round((255 * (SOFT - ratio)) / (SOFT - HARD));
  }

  // Despeckle: drop pixels with almost no inked neighbours (JPEG noise).
  const cleaned = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx]! < 40) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
          if (mask[yy * w + xx]! > 40) n++;
        }
      }
      if (n < 2) cleaned[idx] = 0;
    }
  }

  for (let i = 0, px = 0; i < p.length; i += 4, px++) {
    p[i + 3] = cleaned[px]!;
  }
  bctx.putImageData(src, 0, 0);
  return base.toDataURL("image/png");
}

/** Trim fully-transparent margins so a signature crops to its ink. */
export async function trimTransparent(dataUrl: string): Promise<{ url: string; w: number; h: number }> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3]! > 8) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return { url: dataUrl, w: canvas.width, h: canvas.height };
  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(canvas.width - 1, maxX + pad);
  maxY = Math.min(canvas.height - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return { url: out.toDataURL("image/png"), w, h };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
