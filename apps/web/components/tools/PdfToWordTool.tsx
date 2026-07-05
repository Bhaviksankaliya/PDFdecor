"use client";

import type { Tool } from "@pdfforge/config";
import { SimpleConvertTool } from "./SimpleConvertTool";

export function PdfToWordTool({ tool }: { tool: Tool }) {
  return (
    <SimpleConvertTool
      tool={tool}
      actionLabel="Convert to Word"
      note={
        <>
          Your PDF’s text, paragraphs, and page breaks are rebuilt into an
          editable <strong>.docx</strong>. Complex layouts — multi-column pages,
          tables, and exact positioning — are approximated. Scanned (image-only)
          PDFs need OCR first.
        </>
      }
    />
  );
}
