"use client";

import type { Tool } from "@pdfforge/config";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, RunButton } from "./ui";

export function RemovePagesTool({ tool }: { tool: Tool }) {
  return (
    <PdfWorkbench
      tool={tool}
      mode="select"
      sidebar={(ctx) => (
        <SidebarCard title="Remove pages">
          <p className="text-sm text-slate-500">
            Click the pages you want to delete, then remove them.
          </p>
          <p className="text-sm">
            <span className="font-semibold text-slate-800">{ctx.selected.length}</span>{" "}
            of {ctx.pageCount} pages selected
          </p>
          <RunButton
            label="Remove pages"
            processing={ctx.processing}
            disabled={ctx.selected.length === 0}
            onClick={() => ctx.run({ pages: ctx.selected })}
          />
        </SidebarCard>
      )}
    />
  );
}
