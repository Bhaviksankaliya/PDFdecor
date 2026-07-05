"use client";

import { useState } from "react";
import type { Tool } from "@pdfforge/config";
import type { PageThumb } from "@/lib/pdf";
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

const MARGIN = 24; // points, matches the server

type WmSettings = {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  color: string;
  tile: boolean;
  anchor: Anchor;
};

/**
 * Live preview of the watermark, drawn as an SVG whose viewBox is the page in
 * PDF points — so it scales to any thumbnail size while matching the real,
 * point-based output the server produces.
 */
function WatermarkPreview({ thumb, s }: { thumb: PageThumb; s: WmSettings }) {
  if (!s.text.trim()) return null;
  const pageW = thumb.width / thumb.scale;
  const pageH = thumb.height / thumb.scale;

  const common = {
    fontSize: s.fontSize,
    fill: s.color,
    fillOpacity: s.opacity,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: 700,
    style: { whiteSpace: "pre" as const },
  };

  const texts: JSX.Element[] = [];
  if (s.tile) {
    const stepX = s.fontSize * 6;
    const stepY = s.fontSize * 4;
    let key = 0;
    for (let y = s.fontSize; y < pageH + stepY; y += stepY) {
      for (let x = -stepX; x < pageW; x += stepX) {
        texts.push(
          <text
            key={key++}
            x={x}
            y={y}
            textAnchor="start"
            transform={`rotate(${-s.rotation} ${x} ${y})`}
            {...common}
          >
            {s.text}
          </text>,
        );
      }
    }
  } else {
    const [v, h] = s.anchor.split("-");
    let x = pageW / 2;
    let textAnchor: "start" | "middle" | "end" = "middle";
    if (h === "left") (x = MARGIN), (textAnchor = "start");
    else if (h === "right") (x = pageW - MARGIN), (textAnchor = "end");
    let y = pageH / 2;
    let baseline: "central" | "hanging" | "alphabetic" = "central";
    if (v === "top") (y = MARGIN), (baseline = "hanging");
    else if (v === "bottom") (y = pageH - MARGIN), (baseline = "alphabetic");
    texts.push(
      <text
        key="wm"
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline={baseline}
        transform={`rotate(${-s.rotation} ${x} ${y})`}
        {...common}
      >
        {s.text}
      </text>,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${pageW} ${pageH}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
    >
      {texts}
    </svg>
  );
}

export function WatermarkTool({ tool }: { tool: Tool }) {
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [color, setColor] = useState("#999999");
  const [tile, setTile] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>("middle-center");

  const settings: WmSettings = { text, fontSize, opacity, rotation, color, tile, anchor };

  return (
    <PdfWorkbench
      tool={tool}
      mode="view"
      pageOverlay={(thumb) => <WatermarkPreview thumb={thumb} s={settings} />}
      sidebar={(ctx) => (
        <SidebarCard title="Watermark options">
          <Field label="Text">
            <input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size">
              <input
                type="number"
                min={8}
                max={200}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Rotation°">
              <input
                type="number"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label={`Opacity: ${Math.round(opacity * 100)}%`}>
            <input
              type="range"
              min={5}
              max={100}
              value={opacity * 100}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              className="w-full accent-brand-500"
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={tile}
              onChange={(e) => setTile(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500"
            />
            Tile across the whole page
          </label>
          {!tile && (
            <Field label="Position">
              <AnchorPicker value={anchor} onChange={setAnchor} />
            </Field>
          )}
          <RunButton
            label="Add watermark"
            processing={ctx.processing}
            disabled={!text.trim()}
            onClick={() =>
              ctx.run({
                mode: "text",
                text,
                fontSize,
                opacity,
                rotation,
                color: hexToRgb(color),
                tile,
                anchor,
              })
            }
          />
        </SidebarCard>
      )}
    />
  );
}
