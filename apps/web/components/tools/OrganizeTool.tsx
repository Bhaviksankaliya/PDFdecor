"use client";

import type { Tool } from "@pdfforge/config";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, RunButton } from "./ui";

export function OrganizeTool({ tool }: { tool: Tool }) {
  return (
    <PdfWorkbench
      tool={tool}
      mode="organize"
      sidebar={(ctx) => (
        <SidebarCard title="Organize PDF">
          <p className="text-sm text-slate-500">
            Drag pages to reorder. Hover a page to rotate or delete it.
          </p>
          <p className="text-sm">
            <span className="font-semibold text-slate-800">{ctx.order.length}</span>{" "}
            page(s) in the new document
          </p>
          <RunButton
            label="Save PDF"
            processing={ctx.processing}
            disabled={ctx.order.length === 0}
            onClick={() =>
              ctx.run({
                ops: ctx.order.map((source) => ({
                  source,
                  rotate: ctx.rotations[source] ?? 0,
                })),
              })
            }
          />
        </SidebarCard>
      )}
    />
  );
}
