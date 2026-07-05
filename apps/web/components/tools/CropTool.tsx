"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tool } from "@pdfforge/config";
import type { PageThumb } from "@/lib/pdf";
import { PdfWorkbench } from "./PdfWorkbench";
import { SidebarCard, Field, RunButton, inputCls } from "./ui";

/** Crop box in PDF points, origin bottom-left (what the server expects). */
type Box = { x: number; y: number; width: number; height: number };
/** Same box in SVG coordinates (origin top-left) while dragging. */
type SvgBox = { x: number; y: number; w: number; h: number };

const MIN_SIZE = 24; // smallest crop side, in points

type Drag =
  | { kind: "move"; sx: number; sy: number; orig: SvgBox }
  | { kind: "resize"; ax: number; ay: number } // anchor = fixed opposite corner
  | { kind: "draw"; sx: number; sy: number };

/**
 * Interactive crop preview drawn over each page thumbnail. The SVG viewBox is
 * the page in PDF points, so coordinates match the server output exactly.
 * Drag inside the box to move it, drag a corner to resize, or drag on the
 * page to draw a fresh box. The same box applies to every page.
 */
function CropOverlay({
  thumb,
  box,
  onChange,
}: {
  thumb: PageThumb;
  box: Box | null;
  onChange: (updater: (prev: Box | null) => Box | null) => void;
}) {
  const pageW = thumb.width / thumb.scale;
  const pageH = thumb.height / thumb.scale;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);

  // Initialize a default box (centered, 80% of the page) once thumbs exist.
  useEffect(() => {
    onChange(
      (prev) =>
        prev ?? {
          x: Math.round(pageW * 0.1),
          y: Math.round(pageH * 0.1),
          width: Math.round(pageW * 0.8),
          height: Math.round(pageH * 0.8),
        },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PDF (bottom-left origin) <-> SVG (top-left origin)
  const toSvg = (b: Box): SvgBox => ({
    x: b.x,
    y: pageH - b.y - b.height,
    w: b.width,
    h: b.height,
  });

  const commit = useCallback(
    (s: SvgBox) => {
      const w = Math.min(Math.max(s.w, MIN_SIZE), pageW);
      const h = Math.min(Math.max(s.h, MIN_SIZE), pageH);
      const x = Math.min(Math.max(s.x, 0), pageW - w);
      const y = Math.min(Math.max(s.y, 0), pageH - h);
      onChange(() => ({
        x: Math.round(x),
        y: Math.round(pageH - y - h),
        width: Math.round(w),
        height: Math.round(h),
      }));
    },
    [onChange, pageW, pageH],
  );

  function pos(e: React.PointerEvent): { x: number; y: number } {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * pageW,
      y: ((e.clientY - r.top) / r.height) * pageH,
    };
  }

  function down(e: React.PointerEvent, drag: Drag) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = drag;
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = pos(e);
    if (drag.kind === "move") {
      commit({
        ...drag.orig,
        x: drag.orig.x + (p.x - drag.sx),
        y: drag.orig.y + (p.y - drag.sy),
      });
    } else {
      const ax = drag.kind === "draw" ? drag.sx : drag.ax;
      const ay = drag.kind === "draw" ? drag.sy : drag.ay;
      commit({
        x: Math.min(ax, p.x),
        y: Math.min(ay, p.y),
        w: Math.abs(p.x - ax),
        h: Math.abs(p.y - ay),
      });
    }
  }

  const s = box ? toSvg(box) : null;
  const hs = Math.max(pageW, pageH) * 0.03; // corner-handle half-size (pt)
  const stroke = Math.max(1.5, hs * 0.2);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${pageW} ${pageH}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-auto h-full w-full touch-none"
      onPointerMove={move}
      onPointerUp={() => (dragRef.current = null)}
      onPointerCancel={() => (dragRef.current = null)}
    >
      {/* Drag on the page to draw a new crop box */}
      <rect
        x={0}
        y={0}
        width={pageW}
        height={pageH}
        fill="transparent"
        className="cursor-crosshair"
        onPointerDown={(e) => {
          const p = pos(e);
          down(e, { kind: "draw", sx: p.x, sy: p.y });
        }}
      />
      {s && (
        <>
          {/* Dim everything that will be cropped away */}
          <path
            d={`M0 0H${pageW}V${pageH}H0Z M${s.x} ${s.y}h${s.w}v${s.h}h${-s.w}Z`}
            fill="rgba(15,23,42,0.45)"
            fillRule="evenodd"
            pointerEvents="none"
          />
          {/* Crop box — drag to move */}
          <rect
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill="transparent"
            stroke="#f5482c"
            strokeWidth={stroke}
            className="cursor-move"
            onPointerDown={(e) => {
              const p = pos(e);
              down(e, { kind: "move", sx: p.x, sy: p.y, orig: s });
            }}
          />
          {/* Corner handles — drag to resize (anchor = opposite corner) */}
          {(
            [
              [s.x, s.y, s.x + s.w, s.y + s.h, "cursor-nwse-resize"],
              [s.x + s.w, s.y, s.x, s.y + s.h, "cursor-nesw-resize"],
              [s.x, s.y + s.h, s.x + s.w, s.y, "cursor-nesw-resize"],
              [s.x + s.w, s.y + s.h, s.x, s.y, "cursor-nwse-resize"],
            ] as const
          ).map(([cx, cy, ax, ay, cursor], i) => (
            <rect
              key={i}
              x={cx - hs}
              y={cy - hs}
              width={hs * 2}
              height={hs * 2}
              fill="#fff"
              stroke="#f5482c"
              strokeWidth={stroke * 0.75}
              className={cursor}
              onPointerDown={(e) => down(e, { kind: "resize", ax, ay })}
            />
          ))}
        </>
      )}
    </svg>
  );
}

export function CropTool({ tool }: { tool: Tool }) {
  const [box, setBox] = useState<Box | null>(null);
  const onChange = useCallback(
    (updater: (prev: Box | null) => Box | null) => setBox(updater),
    [],
  );

  const set =
    (k: keyof Box) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setBox((b) => (b ? { ...b, [k]: Number(e.target.value) } : b));

  return (
    <PdfWorkbench
      tool={tool}
      mode="view"
      pageOverlay={(thumb) => (
        <CropOverlay thumb={thumb} box={box} onChange={onChange} />
      )}
      sidebar={(ctx) => (
        <SidebarCard title="Crop area">
          <p className="text-sm text-slate-500">
            Drag the box on the page to position it, pull a corner to resize,
            or drag on the page to draw a new one. The dimmed area is removed.
            The same crop applies to every page.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="X (pt)">
              <input
                type="number"
                value={box?.x ?? ""}
                onChange={set("x")}
                disabled={!box}
                className={inputCls}
              />
            </Field>
            <Field label="Y (pt)">
              <input
                type="number"
                value={box?.y ?? ""}
                onChange={set("y")}
                disabled={!box}
                className={inputCls}
              />
            </Field>
            <Field label="Width (pt)">
              <input
                type="number"
                value={box?.width ?? ""}
                onChange={set("width")}
                disabled={!box}
                className={inputCls}
              />
            </Field>
            <Field label="Height (pt)">
              <input
                type="number"
                value={box?.height ?? ""}
                onChange={set("height")}
                disabled={!box}
                className={inputCls}
              />
            </Field>
          </div>
          <RunButton
            label="Crop PDF"
            processing={ctx.processing}
            disabled={!box || box.width <= 0 || box.height <= 0}
            onClick={() => ctx.run({ box })}
          />
        </SidebarCard>
      )}
    />
  );
}
