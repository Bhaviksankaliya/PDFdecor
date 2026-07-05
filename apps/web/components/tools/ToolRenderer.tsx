"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Tool } from "@pdfforge/config";
import { MergeTool } from "./MergeTool";
import { SplitTool } from "./SplitTool";
import { RemovePagesTool } from "./RemovePagesTool";
import { ExtractPagesTool } from "./ExtractPagesTool";
import { OrganizeTool } from "./OrganizeTool";
import { RotateTool } from "./RotateTool";
import { PageNumbersTool } from "./PageNumbersTool";
import { WatermarkTool } from "./WatermarkTool";
import { CropTool } from "./CropTool";
import { JpgToPdfTool, ScanToPdfTool } from "./ImagesToPdfTool";
import { PdfToJpgTool } from "./PdfToJpgTool";
import { PdfToWordTool } from "./PdfToWordTool";
import { CompressTool } from "./CompressTool";
import { ComingSoon } from "./ComingSoon";

// These pull in Fabric.js (~150kB) — load them only on their own pages.
const EditPdfTool = dynamic(() => import("./EditPdfTool").then((m) => m.EditPdfTool), {
  ssr: false,
  loading: () => (
    <div className="grid place-items-center py-20 text-sm text-slate-400">Loading editor…</div>
  ),
});
const SignPdfTool = dynamic(() => import("./SignPdfTool").then((m) => m.SignPdfTool), {
  ssr: false,
  loading: () => (
    <div className="grid place-items-center py-20 text-sm text-slate-400">Loading…</div>
  ),
});

/**
 * Maps a tool slug to its interactive UI. Adding a tool = drop its component
 * in `components/tools/` and register it here.
 */
const REGISTRY: Record<string, ComponentType<{ tool: Tool }>> = {
  "merge-pdf": MergeTool,
  "split-pdf": SplitTool,
  "remove-pages": RemovePagesTool,
  "extract-pages": ExtractPagesTool,
  "organize-pdf": OrganizeTool,
  "rotate-pdf": RotateTool,
  "page-numbers": PageNumbersTool,
  "watermark-pdf": WatermarkTool,
  "crop-pdf": CropTool,
  "jpg-to-pdf": JpgToPdfTool,
  "scan-to-pdf": ScanToPdfTool,
  "pdf-to-jpg": PdfToJpgTool,
  "pdf-to-word": PdfToWordTool,
  "compress-pdf": CompressTool,
  "edit-pdf": EditPdfTool,
  "sign-pdf": SignPdfTool,
};

export function ToolRenderer({ tool }: { tool: Tool }) {
  const Component = REGISTRY[tool.slug] ?? ComingSoon;
  return <Component tool={tool} />;
}
