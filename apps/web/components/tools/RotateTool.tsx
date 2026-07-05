"use client";

import { useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, RunButton } from "./ui";
import { cn } from "@/lib/cn";

export function RotateTool({ tool }: { tool: Tool }) {
  const [angle, setAngle] = useState(90);
  return (
    <PdfWorkbench
      tool={tool}
      mode="select"
      sidebar={(ctx) => (
        <SidebarCard title="Rotate pages">
          <p className="text-sm text-slate-500">
            Pick a direction. Rotation applies to selected pages, or all pages if
            none are selected.
          </p>
          <div className="flex gap-2">
            {[
              { v: 90, icon: RotateCw, label: "Right" },
              { v: 270, icon: RotateCcw, label: "Left" },
              { v: 180, icon: RotateCw, label: "180°" },
            ].map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setAngle(v)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition",
                  angle === v
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-500 hover:border-brand-300",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {ctx.selected.length > 0
              ? `${ctx.selected.length} page(s) selected`
              : "All pages will be rotated"}
          </p>
          <RunButton
            label="Rotate PDF"
            processing={ctx.processing}
            onClick={() =>
              ctx.run({
                angle,
                pages: ctx.selected.length ? ctx.selected : undefined,
              })
            }
          />
        </SidebarCard>
      )}
    />
  );
}
