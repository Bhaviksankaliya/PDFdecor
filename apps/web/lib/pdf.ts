"use client";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/** Lazily load PDF.js in the browser only, configuring its worker once. */
async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      // Worker is served from /public (copied by the copy-pdf-worker step).
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

export type PageThumb = {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
  /** Rendered pixels per PDF point — lets overlays match real output sizing. */
  scale: number;
};

export type RenderedPage = {
  /** JPEG data URL of the rendered page at the requested scale. */
  dataUrl: string;
  /** Page size in PDF points (rotation-aware, scale 1). */
  widthPt: number;
  heightPt: number;
  /** Rendered pixel size. */
  displayW: number;
  displayH: number;
};

/** A detected line of existing PDF text, in render-scale pixels. */
export type TextLine = {
  text: string;
  x: number;
  top: number;
  width: number;
  /** Approximate font size in px at the render scale. */
  height: number;
  /** CSS-ish font family hint from the PDF (e.g. "serif"). */
  fontFamily?: string;
};

export type OpenPdf = {
  numPages: number;
  pageSize: (index: number) => Promise<{ widthPt: number; heightPt: number }>;
  renderPage: (index: number, scale: number) => Promise<RenderedPage>;
  /** Extract the page's text lines with positions at the given render scale. */
  getTextLines: (index: number, scale: number) => Promise<TextLine[]>;
  destroy: () => Promise<void>;
};

/** 2D affine matrix multiply (PDF/pdfjs [a,b,c,d,e,f] form). */
function mulMatrix(m1: number[], m2: number[]): number[] {
  return [
    m1[0]! * m2[0]! + m1[2]! * m2[1]!,
    m1[1]! * m2[0]! + m1[3]! * m2[1]!,
    m1[0]! * m2[2]! + m1[2]! * m2[3]!,
    m1[1]! * m2[2]! + m1[3]! * m2[3]!,
    m1[0]! * m2[4]! + m1[2]! * m2[5]! + m1[4]!,
    m1[1]! * m2[4]! + m1[3]! * m2[5]! + m1[5]!,
  ];
}

/** Open a PDF once and render pages on demand (used by the editor). */
export async function openPdfDocument(file: File): Promise<OpenPdf> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  return {
    numPages: doc.numPages,
    async pageSize(index) {
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      return { widthPt: base.width, heightPt: base.height };
    },
    async getTextLines(index, scale) {
      const page = await doc.getPage(index + 1);
      const viewport = page.getViewport({ scale });
      const content = await page.getTextContent();
      const vt = viewport.transform as number[];
      const styles = content.styles as Record<
        string,
        { fontFamily?: string; ascent?: number }
      >;

      type Raw = { str: string; x: number; base: number; w: number; h: number; asc: number; font?: string };
      const raw: Raw[] = [];
      for (const it of content.items as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        fontName?: string;
      }>) {
        if (!it.str || !it.str.trim() || !it.transform) continue;
        const m = mulMatrix(vt, it.transform);
        const h = Math.hypot(m[2]!, m[3]!);
        if (h <= 1) continue;
        const style = it.fontName ? styles[it.fontName] : undefined;
        raw.push({
          str: it.str,
          x: m[4]!,
          base: m[5]!,
          w: (it.width ?? 0) * scale,
          h,
          asc: style?.ascent && style.ascent > 0 ? style.ascent : 0.8,
          font: style?.fontFamily,
        });
      }

      // Group fragments that share a baseline into whole lines.
      raw.sort((a, b) => a.base - b.base || a.x - b.x);
      const lines: TextLine[] = [];
      let cur: Raw[] = [];
      const flush = () => {
        if (!cur.length) return;
        cur.sort((a, b) => a.x - b.x);
        let text = cur[0]!.str;
        for (let i = 1; i < cur.length; i++) {
          const prev = cur[i - 1]!;
          const item = cur[i]!;
          const gap = item.x - (prev.x + prev.w);
          const needsSpace =
            gap > prev.h * 0.2 && !text.endsWith(" ") && !item.str.startsWith(" ");
          text += (needsSpace ? " " : "") + item.str;
        }
        const x0 = cur[0]!.x;
        const x1 = Math.max(...cur.map((r) => r.x + r.w));
        const h = Math.max(...cur.map((r) => r.h));
        const asc = Math.max(...cur.map((r) => r.asc));
        const base = cur.reduce((s, r) => s + r.base, 0) / cur.length;
        lines.push({
          text,
          x: x0,
          top: base - asc * h,
          width: Math.max(x1 - x0, 4),
          height: h,
          fontFamily: cur[0]!.font,
        });
      };
      for (const r of raw) {
        if (cur.length && Math.abs(r.base - cur[cur.length - 1]!.base) < r.h * 0.5) {
          cur.push(r);
        } else {
          flush();
          cur = [r];
        }
      }
      flush();
      return lines;
    },
    async renderPage(index, scale) {
      const page = await doc.getPage(index + 1);
      const viewport = page.getViewport({ scale });
      const base = page.getViewport({ scale: 1 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;
      const out: RenderedPage = {
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        widthPt: base.width,
        heightPt: base.height,
        displayW: canvas.width,
        displayH: canvas.height,
      };
      page.cleanup();
      return out;
    },
    async destroy() {
      await doc.destroy();
    },
  };
}

/** Render every page of a PDF file to a small thumbnail data URL. */
export async function renderThumbnails(
  file: File | Uint8Array,
  maxWidth = 220,
): Promise<{ pageCount: number; thumbs: PageThumb[] }> {
  const pdfjs = await getPdfjs();
  const data = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : file;
  const doc = await pdfjs.getDocument({ data }).promise;
  const thumbs: PageThumb[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    // Render at 2× the display width so thumbnails stay crisp on hi-DPI
    // screens (they're displayed downscaled; `scale` stays px-per-point).
    const scale = (maxWidth * 2) / viewport.width;
    const scaled = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(scaled.width);
    canvas.height = Math.ceil(scaled.height);
    const ctx = canvas.getContext("2d")!;
    // intent "print" renders without requestAnimationFrame scheduling, so
    // thumbnails complete even when the tab is hidden/backgrounded.
    await page.render({ canvasContext: ctx, viewport: scaled, intent: "print" }).promise;
    thumbs.push({
      index: i - 1,
      dataUrl: canvas.toDataURL("image/jpeg", 0.8),
      width: scaled.width,
      height: scaled.height,
      scale,
    });
    page.cleanup();
  }
  const pageCount = doc.numPages;
  await doc.destroy();
  return { pageCount, thumbs };
}

/** Quick page count for a PDF file (used for merge stats). */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const n = doc.numPages;
  await doc.destroy();
  return n;
}

export type CompressPage = { blob: Blob; widthPt: number; heightPt: number };

/**
 * Render each page to a JPEG at a reduced scale/quality for compression.
 * Returns the JPEG plus the page's original point size so the server can
 * rebuild the PDF with unchanged geometry.
 */
export async function renderForCompress(
  file: File,
  scale: number,
  quality: number,
  onPage?: (done: number, total: number) => void,
): Promise<CompressPage[]> {
  const MAX_PX = 4000; // cap so oversized pages can't blow up the canvas
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;
  const out: CompressPage[] = [];
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const effScale = Math.min(scale, MAX_PX / base.width, MAX_PX / base.height);
    const viewport = page.getViewport({ scale: effScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    // White matte: flatten transparency so JPEG (no alpha) looks right.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`Could not render page ${i}.`))),
        "image/jpeg",
        quality,
      ),
    );
    out.push({ blob, widthPt: base.width, heightPt: base.height });
    page.cleanup();
    onPage?.(i, total);
  }
  await doc.destroy();
  return out;
}

/** Render pages to full-size JPEG blobs (for PDF → JPG, client-side). */
export async function renderToJpegs(
  file: File,
  scale = 2,
  quality = 0.92,
): Promise<{ name: string; blob: Blob }[]> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: { name: string; blob: Blob }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality),
    );
    out.push({ name: `page_${String(i).padStart(3, "0")}.jpg`, blob });
    page.cleanup();
  }
  await doc.destroy();
  return out;
}
