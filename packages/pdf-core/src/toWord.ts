import { Document, Packer, Paragraph, TextRun } from "docx";
import { PdfOperationError } from "./errors.js";

type Line = { text: string; size: number; y: number; x: number; bold: boolean; italic: boolean };

/** A page's reconstructed lines, top-to-bottom. */
type PageLines = { lines: Line[] };

type TextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  fontName?: string;
};
type TextStyle = { fontFamily?: string };

/**
 * Extract text from a PDF as structured lines using PDF.js (headless, in
 * Node — text only, no rendering). Rebuilds lines from positioned glyph runs.
 */
async function extractPages(bytes: Uint8Array): Promise<PageLines[]> {
  // Loaded lazily so the browser bundle never pulls the Node build.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: PageLines[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const styles = content.styles as Record<string, TextStyle>;

    type Frag = { str: string; x: number; y: number; w: number; size: number; bold: boolean; italic: boolean };
    const frags: Frag[] = [];
    for (const it of content.items as TextItem[]) {
      if (!it.str || !it.transform) continue;
      const [a, b, , d] = it.transform;
      const size = Math.hypot(a ?? 0, b ?? 0) || Math.abs(d ?? 0) || 10;
      const fam = (it.fontName && styles[it.fontName]?.fontFamily) || "";
      frags.push({
        str: it.str,
        x: it.transform[4]!,
        y: it.transform[5]!,
        w: (it.width ?? 0),
        size,
        bold: /bold|black|heavy|semibold/i.test(fam),
        italic: /italic|oblique/i.test(fam),
      });
    }
    page.cleanup();
    if (!frags.length) {
      pages.push({ lines: [] });
      continue;
    }

    // Group fragments into lines by baseline proximity.
    frags.sort((f1, f2) => f2.y - f1.y || f1.x - f2.x);
    const lines: Line[] = [];
    let cur: Frag[] = [];
    const flush = () => {
      if (!cur.length) return;
      cur.sort((f1, f2) => f1.x - f2.x);
      let text = cur[0]!.str;
      for (let k = 1; k < cur.length; k++) {
        const prev = cur[k - 1]!;
        const f = cur[k]!;
        const gap = f.x - (prev.x + prev.w);
        const space = gap > prev.size * 0.25 && !text.endsWith(" ") && !f.str.startsWith(" ");
        text += (space ? " " : "") + f.str;
      }
      const size = cur.reduce((s, f) => s + f.size, 0) / cur.length;
      const bold = cur.filter((f) => f.bold).length >= cur.length / 2;
      const italic = cur.filter((f) => f.italic).length >= cur.length / 2;
      lines.push({ text: text.trim(), size, y: cur[0]!.y, x: cur[0]!.x, bold, italic });
    };
    for (const f of frags) {
      if (cur.length && Math.abs(f.y - cur[cur.length - 1]!.y) < f.size * 0.5) cur.push(f);
      else {
        flush();
        cur = [f];
      }
    }
    flush();
    pages.push({ lines: lines.filter((l) => l.text.length > 0) });
  }

  await doc.destroy();
  return pages;
}

/**
 * Convert a PDF into a Word (.docx) document. Pure text-and-layout
 * reconstruction: preserves paragraphs, page breaks, and font sizes, with
 * best-effort bold/italic. Complex multi-column layouts, tables, and exact
 * positioning are approximated — flag low fidelity to the user.
 */
export async function pdfToWord(bytes: Uint8Array): Promise<Uint8Array> {
  const pages = await extractPages(bytes);
  const hasText = pages.some((p) => p.lines.length > 0);
  if (!hasText) {
    throw new PdfOperationError(
      "NO_TEXT",
      "No selectable text was found — this looks like a scanned PDF. Run OCR first.",
    );
  }

  const children: Paragraph[] = [];
  pages.forEach((page, pageIdx) => {
    // Merge consecutive lines into paragraphs; a big vertical gap starts a new one.
    const paras: Line[][] = [];
    let group: Line[] = [];
    for (let i = 0; i < page.lines.length; i++) {
      const line = page.lines[i]!;
      if (group.length) {
        const prev = group[group.length - 1]!;
        const gap = prev.y - line.y;
        const newPara = gap > prev.size * 1.7 || Math.abs(line.size - prev.size) > 2.5;
        if (newPara) {
          paras.push(group);
          group = [];
        }
      }
      group.push(line);
    }
    if (group.length) paras.push(group);

    paras.forEach((group, pIdx) => {
      const size = group.reduce((s, l) => s + l.size, 0) / group.length;
      const bold = group.filter((l) => l.bold).length >= group.length / 2;
      const italic = group.filter((l) => l.italic).length >= group.length / 2;
      const text = group.map((l) => l.text).join(" ");
      children.push(
        new Paragraph({
          // Start each page (after the first) on a fresh Word page.
          pageBreakBefore: pageIdx > 0 && pIdx === 0,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text,
              bold,
              italics: italic,
              // docx font size is in half-points.
              size: Math.max(8, Math.round(size * 2)),
            }),
          ],
        }),
      );
    });
  });

  const document = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(document);
  return new Uint8Array(buffer);
}
