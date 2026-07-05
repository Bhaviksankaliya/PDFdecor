"use client";

import { useState } from "react";
import type { Tool } from "@pdfforge/config";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, Field, RunButton, AnchorPicker, inputCls, type Anchor } from "./ui";

function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.slice(0, 2), 16) / 255,
    g: parseInt(m.slice(2, 4), 16) / 255,
    b: parseInt(m.slice(4, 6), 16) / 255,
  };
}

export function PageNumbersTool({ tool }: { tool: Tool }) {
  const [anchor, setAnchor] = useState<Anchor>("bottom-center");
  const [format, setFormat] = useState("{n}");
  const [fontSize, setFontSize] = useState(12);
  const [startAt, setStartAt] = useState(1);
  const [color, setColor] = useState("#333333");

  return (
    <PdfWorkbench
      tool={tool}
      mode="view"
      sidebar={(ctx) => (
        <SidebarCard title="Page number options">
          <Field label="Position">
            <AnchorPicker value={anchor} onChange={setAnchor} />
          </Field>
          <Field label="Format ({n} = page, {total} = count)">
            <input value={format} onChange={(e) => setFormat(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Font size">
              <input
                type="number"
                min={4}
                max={96}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Start at">
              <input
                type="number"
                value={startAt}
                onChange={(e) => setStartAt(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Color">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200"
            />
          </Field>
          <RunButton
            label="Add page numbers"
            processing={ctx.processing}
            onClick={() =>
              ctx.run({ anchor, format, fontSize, startAt, color: hexToRgb(color) })
            }
          />
        </SidebarCard>
      )}
    />
  );
}
