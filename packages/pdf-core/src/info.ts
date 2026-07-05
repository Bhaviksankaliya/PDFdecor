import { loadPdf } from "./load.js";

export type PdfInfo = {
  pageCount: number;
  pages: { width: number; height: number; rotation: number }[];
};

export async function getPdfInfo(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await loadPdf(bytes);
  return {
    pageCount: doc.getPageCount(),
    pages: doc.getPages().map((p) => ({
      width: p.getWidth(),
      height: p.getHeight(),
      rotation: p.getRotation().angle,
    })),
  };
}
