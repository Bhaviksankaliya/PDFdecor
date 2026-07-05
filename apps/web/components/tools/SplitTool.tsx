"use client";

import { useState } from "react";
import type { Tool } from "@pdfforge/config";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, Field, RunButton, inputCls } from "./ui";
import { cn } from "@/lib/cn";

type Mode = "ranges" | "everyN" | "individual";

export function SplitTool({ tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState("1-3, 4-6");
  const [n, setN] = useState(1);

  return (
    <PdfWorkbench
      tool={tool}
      mode="view"
      sidebar={(ctx) => (
        <SidebarCard title="Split options">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ["ranges", "Ranges"],
                ["everyN", "Every N"],
                ["individual", "Each page"],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-medium transition",
                  mode === m
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-500 hover:border-brand-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "ranges" && (
            <Field label="Ranges (one file per comma group)">
              <input
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 4-6, 7"
                className={inputCls}
              />
            </Field>
          )}
          {mode === "everyN" && (
            <Field label="Pages per file">
              <input
                type="number"
                min={1}
                value={n}
                onChange={(e) => setN(Math.max(1, Number(e.target.value)))}
                className={inputCls}
              />
            </Field>
          )}
          {mode === "individual" && (
            <p className="text-sm text-slate-500">
              Produces {ctx.pageCount} single-page PDFs in a .zip.
            </p>
          )}

          <RunButton
            label="Split PDF"
            processing={ctx.processing}
            onClick={() => {
              if (mode === "ranges") {
                const list = ranges
                  .split(",")
                  .map((r) => r.trim())
                  .filter(Boolean);
                ctx.run({ kind: "ranges", ranges: list });
              } else if (mode === "everyN") {
                ctx.run({ kind: "everyN", n });
              } else {
                ctx.run({ kind: "individual" });
              }
            }}
          />
        </SidebarCard>
      )}
    />
  );
}
