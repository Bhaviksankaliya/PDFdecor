"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActiveSelection,
  Canvas,
  StaticCanvas,
  Textbox,
  Rect,
  Ellipse,
  Line,
  Path,
  Triangle,
  Group,
  PencilBrush,
  FabricImage,
  Shadow,
  type FabricObject,
} from "fabric";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowUpRight,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Copy,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  Highlighter,
  ImagePlus,
  Italic,
  Loader2,
  Lock,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Strikethrough,
  TextCursorInput,
  Trash2,
  Type,
  Underline,
  Undo2,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { RunButton, SidebarCard, Field, inputCls } from "./ui";
import { openPdfDocument, type OpenPdf, type TextLine } from "@/lib/pdf";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";
import { cn } from "@/lib/cn";
import { installSelectionTheme, styleRotationControl } from "./fabricTheme";

type EditTool =
  | "select"
  | "edittext"
  | "text"
  | "draw"
  | "highlight"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "check"
  | "cross"
  | "whiteout";

type CanvasJson = Record<string, unknown> & { objects?: unknown[] };

type PageData = {
  bg: string;
  displayW: number;
  displayH: number;
  /** Render scale used for this page (px per PDF point). */
  scale: number;
  json: CanvasJson | null;
  /** Undo/redo stacks of full canvas snapshots. `last` mirrors the live state. */
  undo: CanvasJson[];
  redo: CanvasJson[];
  last: CanvasJson | null;
  /** Cached detected text lines for the edit-existing-text tool. */
  textLines?: TextLine[];
  /** Decoded page render for pixel sampling (background patches). */
  bgCanvas?: HTMLCanvasElement;
};

type SelProps = {
  isText: boolean;
  hasStroke: boolean;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  linethrough: boolean;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
  /** Highlight color behind the text, or null for none. */
  textBg: string | null;
  outlineWidth: number;
  outlineColor: string;
  shadowOn: boolean;
  isRect: boolean;
  cornerRadius: number;
  locked: boolean;
};

const TOOL_GROUPS: { id: EditTool; icon: typeof Type; label: string }[][] = [
  [{ id: "select", icon: MousePointer2, label: "Select (V)" }],
  [
    { id: "edittext", icon: TextCursorInput, label: "Edit existing text" },
    { id: "text", icon: Type, label: "Add text" },
    { id: "draw", icon: Pencil, label: "Draw" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
  ],
  [
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "check", icon: Check, label: "Checkmark" },
    { id: "cross", icon: X, label: "Cross" },
    { id: "whiteout", icon: Eraser, label: "Whiteout — cover content" },
  ],
];

const FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
];
const MAX_HISTORY = 50;
const MAX_STRIP_THUMBS = 100;
const EMPTY_JSON: CanvasJson = { objects: [] };

function dataUrlToFile(dataUrl: string, name: string): File {
  const [, b64] = dataUrl.split(",");
  const bin = atob(b64!);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: "image/png" });
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Reconstruct the background behind a horizontal text strip.
 *
 * Strategy: sample several rows above and below the strip. If the samples are
 * overwhelmingly one color (plain paper — the common case for documents), fill
 * with that solid color: perfectly clean, immune to neighbouring lines'
 * ascenders/descenders. Otherwise (gradients/photos) blend per column between
 * robust per-column medians, smoothed horizontally to suppress glyph streaks.
 */
function buildBgPatch(
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  bounds?: { minY?: number; maxY?: number },
): HTMLCanvasElement | null {
  const xi = Math.max(0, Math.floor(x));
  const yi = Math.max(0, Math.floor(y));
  const wi = Math.min(src.width - xi, Math.ceil(w));
  const hi = Math.min(src.height - yi, Math.ceil(h));
  if (wi < 1 || hi < 1) return null;
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Never sample inside neighbouring text lines (their bounds are known).
  const minY = bounds?.minY ?? -1;
  const maxY = bounds?.maxY ?? src.height + 1;
  const OFFSETS = [2, 3, 4, 5, 6, 7];
  const readRow = (ry: number): Uint8ClampedArray | null =>
    ry >= 0 && ry < src.height ? ctx.getImageData(xi, ry, wi, 1).data : null;
  const topRows = OFFSETS.map((o) => yi - o)
    .filter((ry) => ry > minY)
    .map(readRow)
    .filter((r): r is Uint8ClampedArray => r !== null);
  const botRows = OFFSETS.map((o) => yi + hi + o)
    .filter((ry) => ry < maxY)
    .map(readRow)
    .filter((r): r is Uint8ClampedArray => r !== null);
  if (!topRows.length && !botRows.length) return null;

  const medianOf = (vals: number[]): number => {
    vals.sort((a, b) => a - b);
    return vals[vals.length >> 1]!;
  };

  /** Per-column, per-channel median across a set of sampled rows. */
  const medianLine = (rows: Uint8ClampedArray[]): Uint8ClampedArray => {
    const out = new Uint8ClampedArray(wi * 4);
    for (let c = 0; c < wi; c++) {
      for (let ch = 0; ch < 3; ch++) {
        out[c * 4 + ch] = medianOf(rows.map((r) => r[c * 4 + ch]!));
      }
      out[c * 4 + 3] = 255;
    }
    return out;
  };

  // Evaluate each side separately: with tight line spacing one side is often
  // contaminated by a neighbouring line while the other is clean background.
  const medColorOf = (line: Uint8ClampedArray): [number, number, number] =>
    [0, 1, 2].map((ch) => {
      const vals: number[] = [];
      for (let c = 0; c < wi; c++) vals.push(line[c * 4 + ch]!);
      return medianOf(vals);
    }) as [number, number, number];
  const agreeFrac = (line: Uint8ClampedArray, med: [number, number, number]) => {
    let n = 0;
    for (let c = 0; c < wi; c++) {
      const d =
        (line[c * 4]! - med[0]) ** 2 +
        (line[c * 4 + 1]! - med[1]) ** 2 +
        (line[c * 4 + 2]! - med[2]) ** 2;
      if (d < 900) n++;
    }
    return n / wi;
  };
  const sides: { med: [number, number, number]; frac: number }[] = [];
  if (topRows.length) {
    const line = medianLine(topRows);
    const med = medColorOf(line);
    sides.push({ med, frac: agreeFrac(line, med) });
  }
  if (botRows.length) {
    const line = medianLine(botRows);
    const med = medColorOf(line);
    sides.push({ med, frac: agreeFrac(line, med) });
  }
  sides.sort((s1, s2) => s2.frac - s1.frac);

  const out = document.createElement("canvas");
  out.width = wi;
  out.height = hi;
  const octx = out.getContext("2d")!;

  if (sides.length && sides[0]!.frac >= 0.8) {
    // At least one side is clean, uniform background — solid fill with its
    // color is artifact-free regardless of what the other side touches.
    const [r, g, b] = sides[0]!.med;
    octx.fillStyle = `rgb(${r},${g},${b})`;
    octx.fillRect(0, 0, wi, hi);
    return out;
  }

  const topLine = medianLine(topRows.length ? topRows : botRows);
  const botLine = medianLine(botRows.length ? botRows : topRows);

  // Non-uniform background: smooth the sample lines horizontally so a stray
  // contaminated column can't leave a vertical streak, then blend.
  const smooth = (line: Uint8ClampedArray): Uint8ClampedArray => {
    const R = 2;
    const sm = new Uint8ClampedArray(line.length);
    for (let c = 0; c < wi; c++) {
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        let n = 0;
        for (let k = -R; k <= R; k++) {
          const cc = c + k;
          if (cc < 0 || cc >= wi) continue;
          sum += line[cc * 4 + ch]!;
          n++;
        }
        sm[c * 4 + ch] = sum / n;
      }
      sm[c * 4 + 3] = 255;
    }
    return sm;
  };
  const a = smooth(topLine);
  const b = smooth(botLine);

  const img = octx.createImageData(wi, hi);
  for (let row = 0; row < hi; row++) {
    const t = hi <= 1 ? 0.5 : row / (hi - 1);
    for (let col = 0; col < wi; col++) {
      const si = col * 4;
      const di = (row * wi + col) * 4;
      img.data[di] = a[si]! * (1 - t) + b[si]! * t;
      img.data[di + 1] = a[si + 1]! * (1 - t) + b[si + 1]! * t;
      img.data[di + 2] = a[si + 2]! * (1 - t) + b[si + 2]! * t;
      img.data[di + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/**
 * Estimate the color of the text inside a line strip: take the pixels that
 * contrast most with the background reference and average them. Returns null
 * when nothing contrasts enough to be text (then we default to black).
 */
function estimateTextColor(
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  const xi = Math.max(0, Math.floor(x));
  const wi = Math.min(src.width - xi, Math.ceil(w));
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx || wi < 1) return null;

  // Background reference: the row a few px above the strip.
  const bgRowY = Math.max(0, Math.floor(y) - 3);
  const bgRow = ctx.getImageData(xi, bgRowY, wi, 1).data;
  let br = 0;
  let bgG = 0;
  let bb = 0;
  for (let i = 0; i < wi; i++) {
    br += bgRow[i * 4]!;
    bgG += bgRow[i * 4 + 1]!;
    bb += bgRow[i * 4 + 2]!;
  }
  br /= wi;
  bgG /= wi;
  bb /= wi;

  // Scan the middle rows of the strip for the most contrasting pixels.
  const mid = Math.round(y + h / 2);
  const rows = [mid - 1, mid, mid + 1].filter((r) => r >= 0 && r < src.height);
  const cand: { d: number; r: number; g: number; b: number }[] = [];
  for (const rowY of rows) {
    const d = ctx.getImageData(xi, rowY, wi, 1).data;
    for (let i = 0; i < wi; i++) {
      const r = d[i * 4]!;
      const g = d[i * 4 + 1]!;
      const b = d[i * 4 + 2]!;
      const dist = (r - br) ** 2 + (g - bgG) ** 2 + (b - bb) ** 2;
      cand.push({ d: dist, r, g, b });
    }
  }
  cand.sort((a, b) => b.d - a.d);
  if (!cand.length || cand[0]!.d < 2500) return null;
  // Average only core glyph pixels (near the max contrast) — including
  // anti-aliased edge pixels washes the estimate toward gray.
  const dMax = cand[0]!.d;
  const top = cand
    .filter((c) => c.d >= dMax * 0.55)
    .slice(0, Math.max(4, Math.floor(cand.length * 0.08)));
  const n = top.length;
  const sum = top.reduce(
    (s, c) => ({ r: s.r + c.r, g: s.g + c.g, b: s.b + c.b }),
    { r: 0, g: 0, b: 0 },
  );
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(sum.r / n)}${toHex(sum.g / n)}${toHex(sum.b / n)}`;
}

/** Map a PDF font-family hint onto one of the editor's available fonts. */
function mapFont(pdfFamily?: string): string {
  const f = (pdfFamily ?? "").toLowerCase();
  if (f.includes("courier") || f.includes("mono")) return "Courier New";
  if (f.includes("times") || (f.includes("serif") && !f.includes("sans"))) {
    return "Times New Roman";
  }
  return "Arial";
}

/** Small square toggle button used in the Selection panel. */
function ToggleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      // Don't steal focus: keeps a text box's in-editing character selection
      // alive so B/I/U/S can style just the selected characters.
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      aria-pressed={active}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border transition",
        active
          ? "border-brand-500 bg-brand-50 text-brand-600"
          : "border-slate-200 text-slate-500 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

/** True when the key event originates from a text field (incl. fabric's hidden textarea). */
function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return (
    !!t &&
    (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
  );
}

export function EditPdfTool({ tool }: { tool: Tool }) {
  const [stage, setStage] = useState<"upload" | "editor">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [activeTool, setActiveTool] = useState<EditTool>("select");
  const [color, setColor] = useState("#e23316");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [selCount, setSelCount] = useState(0);
  const [selProps, setSelProps] = useState<SelProps | null>(null);
  const [pageThumbs, setPageThumbs] = useState<Record<number, string>>({});
  /** Live angle readout while the user drags the rotate handle. */
  const [rotating, setRotating] = useState<{ angle: number; cx: number; cy: number } | null>(null);
  /** Detected text lines for the edit-existing-text tool ("loading" while detecting). */
  const [textLines, setTextLines] = useState<TextLine[] | "loading" | null>(null);
  /** Page-center smart guides shown while dragging an object. */
  const [moveGuides, setMoveGuides] = useState<{ v: boolean; h: boolean } | null>(null);
  const moveGuidesKey = useRef("");
  /** Internal clipboard for Ctrl+C/V — survives page switches. */
  const clipboardRef = useRef<FabricObject | null>(null);
  // Bumped on every history change so undo/redo buttons + edited dots refresh.
  const [, setHistTick] = useState(0);

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const openRef = useRef<OpenPdf | null>(null);
  const pdfFileIdRef = useRef<string | null>(null);
  const pagesRef = useRef<Record<number, PageData>>({});
  const pageIndexRef = useRef(0);
  const zoomRef = useRef(1);
  const suspendRef = useRef(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Live refs so fabric event handlers read current settings.
  const cfg = useRef({ tool: activeTool, color, strokeWidth });
  cfg.current = { tool: activeTool, color, strokeWidth };

  // ── History ─────────────────────────────────────────────────
  const commitHistory = useCallback(() => {
    if (suspendRef.current) return;
    const canvas = fabricRef.current;
    const pd = pagesRef.current[pageIndexRef.current];
    if (!canvas || !pd) return;
    pd.undo.push(pd.last ?? EMPTY_JSON);
    if (pd.undo.length > MAX_HISTORY) pd.undo.shift();
    pd.redo = [];
    pd.last = canvas.toJSON() as CanvasJson;
    setHistTick((t) => t + 1);
  }, []);

  /** Debounced commit for high-frequency edits (sliders, nudging). */
  const commitSoon = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(commitHistory, 350);
  }, [commitHistory]);

  const restore = useCallback(async (json: CanvasJson) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    suspendRef.current = true;
    await canvas.loadFromJSON(json);
    canvas.renderAll();
    suspendRef.current = false;
    setSelCount(0);
    setSelProps(null);
    setHistTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    const pd = pagesRef.current[pageIndexRef.current];
    if (!pd || pd.undo.length === 0) return;
    const prev = pd.undo.pop()!;
    pd.redo.push(pd.last ?? EMPTY_JSON);
    pd.last = prev;
    void restore(prev);
  }, [restore]);

  const redo = useCallback(() => {
    const pd = pagesRef.current[pageIndexRef.current];
    if (!pd || pd.redo.length === 0) return;
    const next = pd.redo.pop()!;
    pd.undo.push(pd.last ?? EMPTY_JSON);
    pd.last = next;
    void restore(next);
  }, [restore]);

  // ── Page loading / navigation ───────────────────────────────
  const loadPage = useCallback(async (index: number) => {
    const open = openRef.current;
    const canvas = fabricRef.current;
    if (!open || !canvas) return;

    if (!pagesRef.current[index]) {
      const { widthPt, heightPt } = await open.pageSize(index);
      const displayScale = Math.min(2, Math.max(0.6, 720 / widthPt));
      // Rasterize above the display size (device-pixel-ratio aware, and with
      // headroom for zoom) so the page stays crisp instead of going soft.
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const rasterScale = Math.min(displayScale * dpr, 4);
      const r = await open.renderPage(index, rasterScale);
      pagesRef.current[index] = {
        bg: r.dataUrl,
        displayW: Math.round(widthPt * displayScale),
        displayH: Math.round(heightPt * displayScale),
        scale: displayScale,
        json: null,
        undo: [],
        redo: [],
        last: null,
      };
    }
    const data = pagesRef.current[index]!;
    const z = zoomRef.current;
    canvas.setDimensions({ width: data.displayW * z, height: data.displayH * z });
    canvas.setZoom(z);
    (canvas.wrapperEl as HTMLElement).style.backgroundImage = `url(${data.bg})`;
    (canvas.wrapperEl as HTMLElement).style.backgroundSize = "100% 100%";

    suspendRef.current = true;
    canvas.clear();
    if (data.json) await canvas.loadFromJSON(data.json);
    canvas.renderAll();
    suspendRef.current = false;
    data.last = canvas.toJSON() as CanvasJson;
    setSelCount(0);
    setSelProps(null);
    setHistTick((t) => t + 1);
  }, []);

  const saveCurrent = useCallback(() => {
    const canvas = fabricRef.current;
    const pd = pagesRef.current[pageIndexRef.current];
    if (canvas && pd) pd.json = canvas.toJSON() as CanvasJson;
  }, []);

  const goToPage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= numPages || index === pageIndexRef.current) return;
      saveCurrent();
      pageIndexRef.current = index;
      setPageIndex(index);
      setTextLines(null);
      await loadPage(index);
    },
    [numPages, saveCurrent, loadPage],
  );

  function applyZoom(z: number) {
    const clamped = Math.min(2.5, Math.max(0.5, z));
    zoomRef.current = clamped;
    setZoom(clamped);
    const canvas = fabricRef.current;
    const pd = pagesRef.current[pageIndexRef.current];
    if (canvas && pd) {
      canvas.setDimensions({
        width: pd.displayW * clamped,
        height: pd.displayH * clamped,
      });
      canvas.setZoom(clamped);
      canvas.renderAll();
    }
  }

  // ── Selection helpers ───────────────────────────────────────
  const syncSelection = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    // Multi-select wraps objects in a transient ActiveSelection that isn't
    // added to the canvas — style its rotate handle here.
    styleRotationControl(canvas.getActiveObject() ?? undefined);
    const objs = canvas.getActiveObjects();
    setSelCount(objs.length);
    if (objs.length === 1) {
      const o = objs[0]!;
      const isText = o instanceof Textbox;
      const t = o as Textbox;
      const stroke = typeof o.stroke === "string" ? o.stroke : null;
      const fill = typeof o.fill === "string" ? o.fill : "#000000";
      setSelProps({
        isText,
        hasStroke: stroke != null && !isText,
        color: isText ? fill : stroke ?? fill,
        strokeWidth: isText ? 0 : o.strokeWidth ?? 0,
        opacity: o.opacity ?? 1,
        fontSize: isText ? t.fontSize : 0,
        fontFamily: isText ? String(t.fontFamily ?? "Arial") : "",
        bold: isText && (t.fontWeight === "bold" || Number(t.fontWeight) >= 600),
        italic: isText && t.fontStyle === "italic",
        underline: isText && !!t.underline,
        linethrough: isText && !!t.linethrough,
        textAlign: isText ? t.textAlign ?? "left" : "left",
        lineHeight: isText ? t.lineHeight ?? 1.16 : 1.16,
        charSpacing: isText ? t.charSpacing ?? 0 : 0,
        textBg:
          isText && t.textBackgroundColor ? String(t.textBackgroundColor) : null,
        outlineWidth: isText && stroke != null ? o.strokeWidth ?? 0 : 0,
        outlineColor: isText && stroke != null ? stroke : "#000000",
        shadowOn: !!o.shadow,
        isRect: o instanceof Rect,
        cornerRadius: o instanceof Rect ? o.rx ?? 0 : 0,
        locked: !!o.lockMovementX,
      });
    } else {
      setSelProps(null);
    }
  }, []);

  function updateSelection(patch: Partial<SelProps>) {
    const canvas = fabricRef.current;
    const objs = canvas?.getActiveObjects() ?? [];
    if (!canvas || objs.length !== 1 || !selProps) return;
    const o = objs[0]!;
    const isText = o instanceof Textbox;
    const merged = { ...selProps, ...patch };
    // While editing a text box with characters selected, style just that
    // range (word-level bold etc.) instead of the whole box.
    const tb = isText ? (o as Textbox) : null;
    const charSel =
      !!tb && tb.isEditing && (tb.selectionStart ?? 0) !== (tb.selectionEnd ?? 0);

    if (patch.color !== undefined && !charSel) {
      if (isText || o.stroke == null) o.set("fill", patch.color);
      else o.set("stroke", patch.color);
    }
    if (patch.opacity !== undefined) o.set("opacity", patch.opacity);
    if (patch.strokeWidth !== undefined && !isText && o.stroke != null) {
      o.set("strokeWidth", patch.strokeWidth);
    }
    if (patch.cornerRadius !== undefined && o instanceof Rect) {
      o.set({ rx: patch.cornerRadius, ry: patch.cornerRadius });
    }
    if (patch.locked !== undefined) {
      o.set({
        lockMovementX: patch.locked,
        lockMovementY: patch.locked,
        lockScalingX: patch.locked,
        lockScalingY: patch.locked,
        lockRotation: patch.locked,
      });
    }
    if (patch.shadowOn !== undefined) {
      o.set(
        "shadow",
        patch.shadowOn
          ? new Shadow({ color: "rgba(0,0,0,0.35)", blur: 6, offsetX: 2, offsetY: 2 })
          : null,
      );
    }
    if (tb && charSel) {
      const styles: Record<string, unknown> = {};
      if (patch.color !== undefined) styles.fill = patch.color;
      if (patch.bold !== undefined) styles.fontWeight = patch.bold ? "bold" : "normal";
      if (patch.italic !== undefined) styles.fontStyle = patch.italic ? "italic" : "normal";
      if (patch.underline !== undefined) styles.underline = patch.underline;
      if (patch.linethrough !== undefined) styles.linethrough = patch.linethrough;
      if (patch.fontSize !== undefined) styles.fontSize = patch.fontSize;
      if (patch.fontFamily !== undefined) styles.fontFamily = patch.fontFamily;
      if (Object.keys(styles).length) {
        tb.setSelectionStyles(styles, tb.selectionStart, tb.selectionEnd);
      }
    }
    if (isText) {
      const t = o as Textbox;
      if (!charSel) {
        if (patch.fontSize !== undefined) t.set("fontSize", patch.fontSize);
        if (patch.fontFamily !== undefined) t.set("fontFamily", patch.fontFamily);
        if (patch.bold !== undefined) t.set("fontWeight", patch.bold ? "bold" : "normal");
        if (patch.italic !== undefined) t.set("fontStyle", patch.italic ? "italic" : "normal");
        if (patch.underline !== undefined) t.set("underline", patch.underline);
        if (patch.linethrough !== undefined) t.set("linethrough", patch.linethrough);
      }
      if (patch.textAlign !== undefined) t.set("textAlign", patch.textAlign);
      if (patch.lineHeight !== undefined) t.set("lineHeight", patch.lineHeight);
      if (patch.charSpacing !== undefined) t.set("charSpacing", patch.charSpacing);
      if (patch.textBg !== undefined) t.set("textBackgroundColor", patch.textBg ?? "");
      if (patch.outlineWidth !== undefined || patch.outlineColor !== undefined) {
        if (merged.outlineWidth > 0) {
          t.set("stroke", merged.outlineColor);
          t.set("strokeWidth", merged.outlineWidth);
        } else {
          t.set("stroke", null);
          t.set("strokeWidth", 0);
        }
      }
    }
    o.setCoords();
    canvas.requestRenderAll();
    setSelProps((p) => (p ? { ...p, ...patch } : p));
    commitSoon();
  }

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    suspendRef.current = true;
    for (const o of objs) canvas.remove(o);
    canvas.discardActiveObject();
    canvas.renderAll();
    suspendRef.current = false;
    commitHistory();
    setSelCount(0);
    setSelProps(null);
  }, [commitHistory]);

  const duplicateSelected = useCallback(async () => {
    const canvas = fabricRef.current;
    const objs = canvas?.getActiveObjects() ?? [];
    if (!canvas || objs.length !== 1) return;
    const clone = await objs[0]!.clone();
    clone.set({ left: (clone.left ?? 0) + 16, top: (clone.top ?? 0) + 16 });
    canvas.add(clone); // fires object:added -> history
    canvas.setActiveObject(clone);
    canvas.renderAll();
  }, []);

  const copySelected = useCallback(async () => {
    const canvas = fabricRef.current;
    const objs = canvas?.getActiveObjects() ?? [];
    if (!canvas || objs.length !== 1) return;
    clipboardRef.current = await objs[0]!.clone();
  }, []);

  const pasteClipboard = useCallback(async () => {
    const canvas = fabricRef.current;
    const src = clipboardRef.current;
    if (!canvas || !src) return;
    const clone = await src.clone();
    clone.set({ left: (clone.left ?? 0) + 16, top: (clone.top ?? 0) + 16 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
  }, []);

  const selectAllObjects = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects();
    if (!objs.length) return;
    canvas.discardActiveObject();
    const sel = new ActiveSelection(objs, { canvas });
    canvas.setActiveObject(sel);
    canvas.requestRenderAll();
  }, []);

  function alignToPage(dir: "left" | "centerH" | "right" | "top" | "middle" | "bottom") {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    const pd = pagesRef.current[pageIndexRef.current];
    if (!canvas || !obj || !pd) return;
    const br = obj.getBoundingRect();
    const M = 8; // page margin in scene px
    let dx = 0;
    let dy = 0;
    if (dir === "left") dx = M - br.left;
    if (dir === "centerH") dx = (pd.displayW - br.width) / 2 - br.left;
    if (dir === "right") dx = pd.displayW - M - br.width - br.left;
    if (dir === "top") dy = M - br.top;
    if (dir === "middle") dy = (pd.displayH - br.height) / 2 - br.top;
    if (dir === "bottom") dy = pd.displayH - M - br.height - br.top;
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
    obj.setCoords();
    canvas.requestRenderAll();
    commitHistory();
  }

  function flipSelected(axis: "x" | "y") {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    if (axis === "x") obj.set("flipX", !obj.flipX);
    else obj.set("flipY", !obj.flipY);
    obj.setCoords();
    canvas.requestRenderAll();
    commitHistory();
  }

  function reorderSelected(dir: "forward" | "backward") {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!canvas || !obj) return;
    if (dir === "forward") canvas.bringObjectForward(obj);
    else canvas.sendObjectBackwards(obj);
    canvas.renderAll();
    commitHistory();
  }

  // ── Object factory for click-to-place tools ─────────────────
  function makeObject(t: EditTool, x: number, y: number): FabricObject | null {
    const { color, strokeWidth } = cfg.current;
    const strokeOpts = {
      fill: "transparent",
      stroke: color,
      strokeWidth,
      strokeLineCap: "round" as const,
      strokeLineJoin: "round" as const,
    };
    switch (t) {
      case "text":
        return new Textbox("Text", { left: x, top: y, fontSize: 24, fill: color, width: 200, fontFamily: "Arial" });
      case "rect":
        return new Rect({ left: x, top: y, width: 120, height: 80, ...strokeOpts });
      case "ellipse":
        return new Ellipse({ left: x, top: y, rx: 60, ry: 40, ...strokeOpts });
      case "line":
        return new Line([x, y, x + 140, y], { stroke: color, strokeWidth, strokeLineCap: "round" });
      case "arrow": {
        const head = Math.max(10, strokeWidth * 3.5);
        const line = new Line([0, 0, 120, 0], { stroke: color, strokeWidth, strokeLineCap: "round" });
        const tip = new Triangle({
          left: 120 + head / 2,
          top: 0,
          originX: "center",
          originY: "center",
          width: head,
          height: head,
          angle: 90,
          fill: color,
        });
        return new Group([line, tip], { left: x, top: y });
      }
      case "check":
        return new Path("M 4 14 L 12 22 L 26 4", {
          left: x,
          top: y,
          ...strokeOpts,
          strokeWidth: Math.max(3, strokeWidth),
        });
      case "cross":
        return new Path("M 4 4 L 22 22 M 22 4 L 4 22", {
          left: x,
          top: y,
          ...strokeOpts,
          strokeWidth: Math.max(3, strokeWidth),
        });
      case "whiteout":
        return new Rect({ left: x, top: y, width: 140, height: 40, fill: "#ffffff" });
      default:
        return null;
    }
  }

  // ── Init fabric once the editor stage mounts ────────────────
  useEffect(() => {
    if (stage !== "editor" || !canvasElRef.current || fabricRef.current) return;
    installSelectionTheme();
    const canvas = new Canvas(canvasElRef.current, {
      backgroundColor: "rgba(0,0,0,0)",
      preserveObjectStacking: true,
      // Brand-tinted rubber-band selection instead of the default blue.
      selectionColor: "rgba(245,72,44,0.08)",
      selectionBorderColor: "#f5482c",
      selectionLineWidth: 1.5,
      // Select strokes by their pixels (with tolerance) rather than their
      // full bounding box — freehand scribbles stop swallowing clicks.
      perPixelTargetFind: true,
      targetFindTolerance: 8,
    });
    fabricRef.current = canvas;

    canvas.on("mouse:down", (opt) => {
      const t = cfg.current.tool;
      if (t === "select" || t === "draw" || t === "highlight") return;
      const p = canvas.getScenePoint(opt.e);

      if (t === "edittext") {
        // Replace the clicked original line: cover it with whiteout and put
        // an editable, pre-filled text box in its place.
        const lines = pagesRef.current[pageIndexRef.current]?.textLines;
        if (!lines) return; // still detecting
        const hit = lines.find(
          (l) =>
            p.x >= l.x - 4 &&
            p.x <= l.x + l.width + 4 &&
            p.y >= l.top - 4 &&
            p.y <= l.top + l.height * 1.35,
        );
        if (!hit) return;
        const pd = pagesRef.current[pageIndexRef.current]!;
        const pad = Math.max(2, hit.height * 0.2);
        // Keep the cover inside the vertical gap between neighbouring lines
        // so it can never clip or sample the line above/below.
        const hitBottom = hit.top + hit.height * 1.3;
        let prevBottom = -Infinity;
        let nextTop = Infinity;
        for (const l of lines) {
          if (l === hit) continue;
          const lb = l.top + l.height * 1.3;
          if (lb <= hit.top + 1 && lb > prevBottom) prevBottom = lb;
          if (l.top >= hitBottom - 1 && l.top < nextTop) nextTop = l.top;
        }
        const cx = hit.x - pad;
        const cy = Math.min(
          hit.top,
          Math.max(hit.top - pad, Number.isFinite(prevBottom) ? prevBottom + 1 : -Infinity, 0),
        );
        const cw = hit.width + pad * 2;
        const coverBottom = Math.max(
          hit.top + hit.height,
          Math.min(hitBottom + pad, Number.isFinite(nextTop) ? nextTop - 1 : Infinity),
        );
        const ch = coverBottom - cy;
        // Cover the original line with a reconstructed-background patch so
        // the page design stays intact; fall back to white if unavailable.
        const patch = pd.bgCanvas
          ? buildBgPatch(pd.bgCanvas, cx, cy, cw, ch, {
              minY: Number.isFinite(prevBottom) ? prevBottom : undefined,
              maxY: Number.isFinite(nextTop) ? nextTop : undefined,
            })
          : null;
        const cover = patch
          ? new FabricImage(patch, { left: Math.max(0, Math.floor(cx)), top: Math.max(0, Math.floor(cy)) })
          : new Rect({ left: cx, top: cy, width: cw, height: ch, fill: "#ffffff" });
        // Default to solid black; only trust the estimate when it's clearly a
        // colored or light-on-dark text (anti-aliased edges read as gray).
        let textColor = "#000000";
        const est =
          pd.bgCanvas &&
          estimateTextColor(pd.bgCanvas, hit.x, hit.top, hit.width, hit.height);
        if (est) {
          const r = parseInt(est.slice(1, 3), 16);
          const g = parseInt(est.slice(3, 5), 16);
          const b = parseInt(est.slice(5, 7), 16);
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (sat > 40) textColor = est;
          else if (lum > 160) textColor = "#ffffff";
        }
        const tb = new Textbox(hit.text, {
          left: hit.x,
          top: hit.top,
          fontSize: Math.max(6, Math.round(hit.height)),
          fontFamily: mapFont(hit.fontFamily),
          fill: textColor,
          width: Math.max(hit.width * 1.2 + 12, 60),
        });
        suspendRef.current = true;
        canvas.add(cover, tb);
        suspendRef.current = false;
        commitHistory();
        canvas.setActiveObject(tb);
        tb.enterEditing();
        tb.selectAll();
        canvas.renderAll();
        setActiveTool("select");
        return;
      }

      const obj = makeObject(t, p.x, p.y);
      if (!obj) return;
      canvas.add(obj);
      canvas.setActiveObject(obj);
      if (obj instanceof Textbox) {
        obj.enterEditing();
        obj.selectAll();
      }
      canvas.renderAll();
      setActiveTool("select");
    });

    canvas.on("object:added", (e) => styleRotationControl(e.target));
    canvas.on("object:added", commitHistory);
    canvas.on("object:modified", commitHistory);

    // Live angle badge + alignment guides while rotating.
    canvas.on("object:rotating", (e) => {
      const t = e.target;
      if (!t) return;
      const c = t.getCenterPoint();
      const z = zoomRef.current;
      const angle = ((Math.round(t.angle ?? 0) % 360) + 360) % 360;
      setRotating({ angle, cx: c.x * z, cy: c.y * z });
    });

    // Page-center smart guides: snap while dragging near the middle.
    canvas.on("object:moving", (e) => {
      const t = e.target;
      const pd = pagesRef.current[pageIndexRef.current];
      if (!t || !pd) return;
      const br = t.getBoundingRect();
      const cx = br.left + br.width / 2;
      const cy = br.top + br.height / 2;
      const TH = 6;
      let v = false;
      let h = false;
      if (Math.abs(cx - pd.displayW / 2) < TH) {
        t.set({ left: (t.left ?? 0) + (pd.displayW / 2 - cx) });
        v = true;
      }
      if (Math.abs(cy - pd.displayH / 2) < TH) {
        t.set({ top: (t.top ?? 0) + (pd.displayH / 2 - cy) });
        h = true;
      }
      if (v || h) t.setCoords();
      const key = `${v}-${h}`;
      if (key !== moveGuidesKey.current) {
        moveGuidesKey.current = key;
        setMoveGuides(v || h ? { v, h } : null);
      }
    });

    canvas.on("mouse:up", () => {
      setRotating(null);
      moveGuidesKey.current = "";
      setMoveGuides(null);
    });
    canvas.on("object:removed", commitHistory);
    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", () => {
      setSelCount(0);
      setSelProps(null);
    });

    void loadPage(0);

    return () => {
      void canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Apply tool/brush settings ───────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const drawing = activeTool === "draw" || activeTool === "highlight";
    canvas.isDrawingMode = drawing;
    canvas.selection = activeTool === "select";
    if (drawing) {
      const brush = new PencilBrush(canvas);
      if (activeTool === "highlight") {
        brush.color = hexToRgba(color, 0.35);
        brush.width = Math.max(strokeWidth * 5, 14);
      } else {
        brush.color = color;
        brush.width = strokeWidth;
      }
      canvas.freeDrawingBrush = brush;
    }
    if (!drawing && activeTool !== "select") {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
    // Placement tools shouldn't grab existing objects on click.
    canvas.skipTargetFind = !(activeTool === "select" || drawing);
    canvas.defaultCursor = activeTool === "edittext" ? "text" : "default";
  }, [activeTool, color, strokeWidth]);

  // ── Detect existing text when the edit-text tool is active ──
  useEffect(() => {
    if (stage !== "editor" || activeTool !== "edittext") return;
    const open = openRef.current;
    const pd = pagesRef.current[pageIndex];
    if (!open || !pd) return;
    // Decode the page render once so covers can sample the background.
    if (!pd.bgCanvas) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = pd.displayW;
        c.height = pd.displayH;
        c.getContext("2d")?.drawImage(img, 0, 0, pd.displayW, pd.displayH);
        pd.bgCanvas = c;
      };
      img.src = pd.bg;
    }
    if (pd.textLines) {
      setTextLines(pd.textLines);
      return;
    }
    let cancelled = false;
    setTextLines("loading");
    open
      .getTextLines(pageIndex, pd.scale)
      .then((lines) => {
        if (cancelled) return;
        pd.textLines = lines;
        setTextLines(lines);
      })
      .catch(() => {
        if (!cancelled) setTextLines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stage, activeTool, pageIndex]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stage !== "editor" || isTypingTarget(e)) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        void copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        void pasteClipboard();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllObjects();
        return;
      }
      if (e.key === "Escape") {
        canvas.discardActiveObject();
        canvas.renderAll();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        const objs = canvas.getActiveObjects();
        if (!objs.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        for (const o of objs) {
          o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
          o.setCoords();
        }
        canvas.requestRenderAll();
        commitSoon();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    stage,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    selectAllObjects,
    commitSoon,
  ]);

  // ── Background thumbnail strip rendering ────────────────────
  useEffect(() => {
    if (stage !== "editor" || !openRef.current) return;
    let cancelled = false;
    const open = openRef.current;
    (async () => {
      const count = Math.min(open.numPages, MAX_STRIP_THUMBS);
      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        try {
          const { widthPt } = await open.pageSize(i);
          // 2× the ~90px display width so strip thumbs are sharp on hi-DPI.
          const r = await open.renderPage(i, Math.min(0.7, 180 / widthPt));
          if (cancelled) return;
          setPageThumbs((prev) => ({ ...prev, [i]: r.dataUrl }));
        } catch {
          return; // doc was destroyed (reset) — stop quietly
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage]);

  // ── Upload / apply / reset ──────────────────────────────────
  async function onFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const [up, open] = await Promise.all([uploadFile(file), openPdfDocument(file)]);
      pdfFileIdRef.current = up.fileId;
      openRef.current = open;
      pagesRef.current = {};
      pageIndexRef.current = 0;
      setPageThumbs({});
      setNumPages(open.numPages);
      setPageIndex(0);
      setStage("editor");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function addImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const canvas = fabricRef.current;
    if (!file || !canvas) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await FabricImage.fromURL(reader.result as string);
      const max = canvas.getWidth() / zoomRef.current * 0.5;
      if (img.width && img.width > max) img.scale(max / img.width);
      img.set({ left: 40, top: 40 });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    };
    reader.readAsDataURL(file);
  }

  function clearPage() {
    const canvas = fabricRef.current;
    if (!canvas || canvas.getObjects().length === 0) return;
    suspendRef.current = true;
    canvas.remove(...canvas.getObjects());
    canvas.discardActiveObject();
    canvas.renderAll();
    suspendRef.current = false;
    commitHistory();
    setSelCount(0);
    setSelProps(null);
  }

  async function apply() {
    saveCurrent();
    setProcessing(true);
    setError(null);
    try {
      const overlays: { pageIndex: number; imageFileId: string }[] = [];
      for (const [idxStr, data] of Object.entries(pagesRef.current)) {
        const objs = data.json?.objects;
        if (!objs || objs.length === 0) continue;
        const idx = Number(idxStr);
        const el = document.createElement("canvas");
        const sc = new StaticCanvas(el, { width: data.displayW, height: data.displayH });
        await sc.loadFromJSON(data.json!);
        sc.renderAll();
        // 3× ≈ 260 DPI on a letter page — edits print crisply.
        const dataUrl = sc.toDataURL({ format: "png", multiplier: 3 });
        void sc.dispose();
        const up = await uploadFile(dataUrlToFile(dataUrl, `overlay_${idx}.png`));
        overlays.push({ pageIndex: idx, imageFileId: up.fileId });
      }
      if (overlays.length === 0) {
        setError("Add some text or shapes before applying.");
        return;
      }
      const res = await processTool(tool.slug, [pdfFileIdRef.current!], { overlays });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    void openRef.current?.destroy();
    openRef.current = null;
    pagesRef.current = {};
    pageIndexRef.current = 0;
    setPageThumbs({});
    setResult(null);
    setStage("upload");
    setZoom(1);
    zoomRef.current = 1;
    setTextLines(null);
    setActiveTool("select");
  }

  // ── Render ──────────────────────────────────────────────────
  if (stage === "upload") {
    return (
      <div className="space-y-4">
        {loading ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-3 text-sm text-slate-500">Opening your PDF…</p>
          </div>
        ) : (
          <Dropzone accept={tool.accepts} multiple={false} onFiles={onFile} label="Select a PDF to edit" />
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const pd = pagesRef.current[pageIndex];
  const canUndo = (pd?.undo.length ?? 0) > 0;
  const canRedo = (pd?.redo.length ?? 0) > 0;
  const editedPages = Object.entries(pagesRef.current)
    .filter(([, d]) => (d.last?.objects?.length ?? 0) > 0)
    .map(([i]) => Number(i));

  const toolBtn = (t: { id: EditTool; icon: typeof Type; label: string }) => (
    <button
      key={t.id}
      onClick={() => setActiveTool(t.id)}
      title={t.label}
      aria-label={t.label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg transition",
        activeTool === t.id ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      <t.icon className="h-5 w-5" />
    </button>
  );

  return (
    <div className="space-y-4">
      {result && <InlineResult result={result} onReset={reset} title="Edited PDF ready" />}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
        {TOOL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-1">
            {gi > 0 && <div className="mx-1 h-6 w-px bg-slate-200" />}
            {group.map(toolBtn)}
          </div>
        ))}
        <div className="mx-1 h-6 w-px bg-slate-200" />
        <label
          title="Add image"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <ImagePlus className="h-5 w-5" />
          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={addImage} />
        </label>

        <div className="mx-1 h-6 w-px bg-slate-200" />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-slate-200"
          aria-label="Color for new objects"
          title="Color"
        />
        <label className="flex items-center gap-2 text-xs text-slate-500" title="Stroke width">
          W
          <input
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20 accent-brand-500"
          />
        </label>

        <div className="mx-1 h-6 w-px bg-slate-200" />
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <Redo2 className="h-5 w-5" />
        </button>
        <button
          onClick={clearPage}
          title="Clear this page"
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          Clear page
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => applyZoom(zoom - 0.25)}
            title="Zoom out"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="w-11 text-center text-xs font-medium text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => applyZoom(zoom + 0.25)}
            title="Zoom in"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Page thumbnail strip */}
      {numPages > 1 && (
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-card">
          {Array.from({ length: numPages }, (_, i) => (
            <button
              key={i}
              onClick={() => void goToPage(i)}
              title={`Page ${i + 1}`}
              className={cn(
                "relative shrink-0 rounded-md border-2 p-0.5 transition",
                i === pageIndex ? "border-brand-500" : "border-transparent hover:border-brand-200",
              )}
            >
              {pageThumbs[i] ? (
                <img src={pageThumbs[i]} alt={`Page ${i + 1}`} className="h-16 w-auto rounded-sm" />
              ) : (
                <span className="grid h-16 w-12 place-items-center rounded-sm bg-slate-100 text-xs text-slate-400">
                  {i + 1}
                </span>
              )}
              {editedPages.includes(i) && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Edit-existing-text status */}
      {activeTool === "edittext" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {textLines === "loading" && "Detecting text on this page…"}
          {Array.isArray(textLines) &&
            textLines.length > 0 &&
            `${textLines.length} text line(s) found — click an outlined line to edit it. The original is covered and replaced with editable text (best-effort font match).`}
          {Array.isArray(textLines) &&
            textLines.length === 0 &&
            "No selectable text found on this page — it may be a scanned image. Run OCR PDF first, or add new text on top."}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Canvas */}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <div className="relative mx-auto w-fit shadow-card">
            <canvas ref={canvasElRef} />
            {/* Clickable-line hints for the edit-existing-text tool */}
            {activeTool === "edittext" &&
              Array.isArray(textLines) &&
              textLines.map((l, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute rounded-sm border border-dashed border-amber-500/80 bg-amber-300/10"
                  style={{
                    left: l.x * zoom - 2,
                    top: l.top * zoom - 2,
                    width: l.width * zoom + 4,
                    height: l.height * 1.3 * zoom + 4,
                  }}
                />
              ))}
            {/* Page-center smart guides while dragging */}
            {moveGuides?.v && pd && (
              <div
                className="pointer-events-none absolute bottom-0 top-0 border-l border-dashed border-pink-500"
                style={{ left: (pd.displayW / 2) * zoom }}
              />
            )}
            {moveGuides?.h && pd && (
              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-pink-500"
                style={{ top: (pd.displayH / 2) * zoom }}
              />
            )}
            {rotating && (
              <>
                {/* Guides when exactly horizontal (0°/180°) or vertical (90°/270°) */}
                {rotating.angle % 180 === 0 && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-emerald-500"
                    style={{ top: rotating.cy }}
                  />
                )}
                {rotating.angle % 180 === 90 && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 border-l-2 border-dashed border-emerald-500"
                    style={{ left: rotating.cx }}
                  />
                )}
                {/* Angle badge */}
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2"
                  style={{ left: rotating.cx, top: Math.max(4, rotating.cy - 64) }}
                >
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-white shadow",
                      rotating.angle % 90 === 0 ? "bg-emerald-500" : "bg-slate-800",
                    )}
                  >
                    {rotating.angle}°
                    {rotating.angle % 180 === 0 && " · Horizontal"}
                    {rotating.angle % 180 === 90 && " · Vertical"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Side panel */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <button
                onClick={() => void goToPage(pageIndex - 1)}
                disabled={pageIndex === 0}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-slate-700">
                Page {pageIndex + 1} / {numPages}
              </span>
              <button
                onClick={() => void goToPage(pageIndex + 1)}
                disabled={pageIndex === numPages - 1}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {editedPages.length > 0 && (
              <p className="mt-2 text-center text-xs text-slate-400">
                {editedPages.length} page(s) with edits
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Click the page to place the selected tool. Double-click text to
              edit; select characters and hit B/I/U to style just that part.
              Arrows nudge (Shift = ×10), Ctrl+Z/Y undo/redo, Ctrl+C/V
              copy-paste (works across pages), Ctrl+A selects all, Ctrl+D
              duplicates, Delete removes. Rotation snaps near 0°/45°/90°;
              dragging snaps to the page center.
            </p>
            <RunButton label="Apply changes" processing={processing} onClick={apply} />
          </div>

          {/* Selection properties */}
          {selCount === 1 && selProps && (
            <SidebarCard title={selProps.isText ? "Text" : "Selection"}>
              {selProps.isText && (
                <>
                  <div className="grid grid-cols-[1fr_72px] gap-2">
                    <Field label="Font">
                      <select
                        value={selProps.fontFamily}
                        onChange={(e) => updateSelection({ fontFamily: e.target.value })}
                        className={inputCls}
                      >
                        {FONTS.map((f) => (
                          <option key={f} value={f} style={{ fontFamily: f }}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Size">
                      <input
                        type="number"
                        min={6}
                        max={300}
                        value={selProps.fontSize}
                        onChange={(e) => updateSelection({ fontSize: Number(e.target.value) })}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <ToggleBtn
                      active={selProps.bold}
                      onClick={() => updateSelection({ bold: !selProps.bold })}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </ToggleBtn>
                    <ToggleBtn
                      active={selProps.italic}
                      onClick={() => updateSelection({ italic: !selProps.italic })}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </ToggleBtn>
                    <ToggleBtn
                      active={selProps.underline}
                      onClick={() => updateSelection({ underline: !selProps.underline })}
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </ToggleBtn>
                    <ToggleBtn
                      active={selProps.linethrough}
                      onClick={() => updateSelection({ linethrough: !selProps.linethrough })}
                      title="Strikethrough"
                    >
                      <Strikethrough className="h-4 w-4" />
                    </ToggleBtn>
                    <span className="mx-0.5 w-px self-stretch bg-slate-200" />
                    {(
                      [
                        ["left", AlignLeft],
                        ["center", AlignCenter],
                        ["right", AlignRight],
                        ["justify", AlignJustify],
                      ] as const
                    ).map(([align, Icon]) => (
                      <ToggleBtn
                        key={align}
                        active={selProps.textAlign === align}
                        onClick={() => updateSelection({ textAlign: align })}
                        title={`Align ${align}`}
                      >
                        <Icon className="h-4 w-4" />
                      </ToggleBtn>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Text color">
                      <input
                        type="color"
                        value={selProps.color}
                        onChange={(e) => updateSelection({ color: e.target.value })}
                        className="h-9 w-full cursor-pointer rounded-lg border border-slate-200"
                      />
                    </Field>
                    <Field label="Highlight">
                      <div className="flex gap-1">
                        <input
                          type="color"
                          value={selProps.textBg ?? "#fff59d"}
                          onChange={(e) => updateSelection({ textBg: e.target.value })}
                          className="h-9 w-full cursor-pointer rounded-lg border border-slate-200"
                        />
                        {selProps.textBg && (
                          <button
                            onClick={() => updateSelection({ textBg: null })}
                            title="Remove highlight"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </Field>
                  </div>

                  <Field label={`Line height: ${selProps.lineHeight.toFixed(2)}`}>
                    <input
                      type="range"
                      min={0.8}
                      max={2.5}
                      step={0.05}
                      value={selProps.lineHeight}
                      onChange={(e) => updateSelection({ lineHeight: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </Field>
                  <Field label={`Letter spacing: ${selProps.charSpacing}`}>
                    <input
                      type="range"
                      min={-100}
                      max={800}
                      step={10}
                      value={selProps.charSpacing}
                      onChange={(e) => updateSelection({ charSpacing: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </Field>
                  <Field label={`Outline: ${selProps.outlineWidth || "none"}`}>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={0.5}
                      value={selProps.outlineWidth}
                      onChange={(e) => updateSelection({ outlineWidth: Number(e.target.value) })}
                      className="w-full accent-brand-500"
                    />
                  </Field>
                  {selProps.outlineWidth > 0 && (
                    <Field label="Outline color">
                      <input
                        type="color"
                        value={selProps.outlineColor}
                        onChange={(e) => updateSelection({ outlineColor: e.target.value })}
                        className="h-9 w-full cursor-pointer rounded-lg border border-slate-200"
                      />
                    </Field>
                  )}
                </>
              )}

              {!selProps.isText && (
                <Field label="Color">
                  <input
                    type="color"
                    value={selProps.color}
                    onChange={(e) => updateSelection({ color: e.target.value })}
                    className="h-9 w-full cursor-pointer rounded-lg border border-slate-200"
                  />
                </Field>
              )}
              {selProps.isRect && (
                <Field label={`Corner radius: ${selProps.cornerRadius}`}>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={selProps.cornerRadius}
                    onChange={(e) => updateSelection({ cornerRadius: Number(e.target.value) })}
                    className="w-full accent-brand-500"
                  />
                </Field>
              )}
              {selProps.hasStroke && (
                <Field label={`Stroke width: ${selProps.strokeWidth}`}>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={selProps.strokeWidth}
                    onChange={(e) => updateSelection({ strokeWidth: Number(e.target.value) })}
                    className="w-full accent-brand-500"
                  />
                </Field>
              )}

              <Field label={`Opacity: ${Math.round(selProps.opacity * 100)}%`}>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selProps.opacity * 100}
                  onChange={(e) => updateSelection({ opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-brand-500"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={selProps.shadowOn}
                  onChange={(e) => updateSelection({ shadowOn: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                />
                Drop shadow
              </label>

              <Field label="Arrange on page">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ["left", AlignStartVertical, "Align left"],
                      ["centerH", AlignCenterVertical, "Center horizontally"],
                      ["right", AlignEndVertical, "Align right"],
                      ["top", AlignStartHorizontal, "Align top"],
                      ["middle", AlignCenterHorizontal, "Center vertically"],
                      ["bottom", AlignEndHorizontal, "Align bottom"],
                    ] as const
                  ).map(([dir, Icon, label]) => (
                    <ToggleBtn key={dir} active={false} onClick={() => alignToPage(dir)} title={label}>
                      <Icon className="h-4 w-4" />
                    </ToggleBtn>
                  ))}
                  <span className="mx-0.5 w-px self-stretch bg-slate-200" />
                  <ToggleBtn active={false} onClick={() => flipSelected("x")} title="Flip horizontal">
                    <FlipHorizontal className="h-4 w-4" />
                  </ToggleBtn>
                  <ToggleBtn active={false} onClick={() => flipSelected("y")} title="Flip vertical">
                    <FlipVertical className="h-4 w-4" />
                  </ToggleBtn>
                </div>
              </Field>
              <div className="flex gap-1.5">
                <button
                  onClick={() => void duplicateSelected()}
                  title="Duplicate (Ctrl+D)"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={() => reorderSelected("forward")}
                  title="Bring forward"
                  className="grid flex-1 place-items-center rounded-lg border border-slate-200 py-2 text-slate-600 hover:bg-slate-50"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => reorderSelected("backward")}
                  title="Send backward"
                  className="grid flex-1 place-items-center rounded-lg border border-slate-200 py-2 text-slate-600 hover:bg-slate-50"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateSelection({ locked: !selProps.locked })}
                  title={selProps.locked ? "Unlock" : "Lock in place"}
                  className={cn(
                    "grid flex-1 place-items-center rounded-lg border py-2",
                    selProps.locked
                      ? "border-brand-500 bg-brand-50 text-brand-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {selProps.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </button>
                <button
                  onClick={deleteSelected}
                  title="Delete"
                  className="grid flex-1 place-items-center rounded-lg border border-slate-200 py-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </SidebarCard>
          )}
          {selCount > 1 && (
            <SidebarCard title={`${selCount} objects selected`}>
              <button
                onClick={deleteSelected}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" /> Delete all
              </button>
            </SidebarCard>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </aside>
      </div>
    </div>
  );
}
