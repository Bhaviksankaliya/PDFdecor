"use client";

import { useState } from "react";
import type { Tool } from "@pdfforge/config";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, RunButton } from "./ui";

export function ExtractPagesTool({ tool }: { tool: Tool }) {
  const [separate, setSeparate] = useState(false);
  return (
    <PdfWorkbench
      tool={tool}
      mode="select"
      sidebar={(ctx) => (
        <SidebarCard title="Extract pages">
          <p className="text-sm text-slate-500">
            Select the pages to keep as a new PDF.
          </p>
          <p className="text-sm">
            <span className="font-semibold text-slate-800">{ctx.selected.length}</span>{" "}
            of {ctx.pageCount} pages selected
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={separate}
              onChange={(e) => setSeparate(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500"
            />
            Save each page as a separate file (.zip)
          </label>
          <RunButton
            label="Extract pages"
            processing={ctx.processing}
            disabled={ctx.selected.length === 0}
            onClick={() => ctx.run({ pages: ctx.selected, separate })}
          />
        </SidebarCard>
      )}
    />
  );
}
