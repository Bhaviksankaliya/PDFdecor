"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, StaticCanvas, Textbox, FabricImage, type FabricObject } from "fabric";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  PenLine,
  Redo2,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { RunButton } from "./ui";
import { SignaturePad, type SignatureResult } from "./SignaturePad";
import { installSelectionTheme, styleRotationControl } from "./fabricTheme";
import { openPdfDocument, type OpenPdf } from "@/lib/pdf";
import { dataUrlToFile } from "@/lib/overlay";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";
import { cn } from "@/lib/cn";

type CanvasJson = Record<string, unknown> & { objects?: unknown[] };
type PageData = {
  bg: string;
  displayW: number;
  displayH: number;
  json: CanvasJson | null;
  /** Per-page undo/redo snapshots; `last` mirrors the live canvas. */
  undo: CanvasJson[];
  redo: CanvasJson[];
  last: CanvasJson | null;
};

const MAX_HISTORY = 50;
const EMPTY_JSON: CanvasJson = { objects: [] };

export function SignPdfTool({ tool }: { tool: Tool }) {
  const [stage, setStage] = useState<"upload" | "editor">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [padOpen, setPadOpen] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const openRef = useRef<OpenPdf | null>(null);
  const pdfFileIdRef = useRef<string | null>(null);
  const pagesRef = useRef<Record<number, PageData>>({});
  const pageIndexRef = useRef(0);
  // Reusable last-created signature, so it can be dropped on several pages.
  const lastSigRef = useRef<SignatureResult | null>(null);
  // History guard + cross-page clipboard.
  const suspendRef = useRef(false);
  const clipboardRef = useRef<FabricObject | null>(null);
  const [, setHistTick] = useState(0);

  const refreshCounts = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setPlacedCount(canvas.getObjects().length);
    setHasSelection(!!canvas.getActiveObject());
  }, []);

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

  const restore = useCallback(async (json: CanvasJson) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    suspendRef.current = true;
    await canvas.loadFromJSON(json);
    canvas.renderAll();
    suspendRef.current = false;
    refreshCounts();
    setHistTick((t) => t + 1);
  }, [refreshCounts]);

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

  const copySelected = useCallback(async () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj) clipboardRef.current = await obj.clone();
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

  const loadPage = useCallback(async (index: number) => {
    const open = openRef.current;
    const canvas = fabricRef.current;
    if (!open || !canvas) return;
    if (!pagesRef.current[index]) {
      const { widthPt, heightPt } = await open.pageSize(index);
      const displayScale = Math.min(2, Math.max(0.6, 720 / widthPt));
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const r = await open.renderPage(index, Math.min(displayScale * dpr, 4));
      pagesRef.current[index] = {
        bg: r.dataUrl,
        displayW: Math.round(widthPt * displayScale),
        displayH: Math.round(heightPt * displayScale),
        json: null,
        undo: [],
        redo: [],
        last: null,
      };
    }
    const data = pagesRef.current[index]!;
    canvas.setDimensions({ width: data.displayW, height: data.displayH });
    (canvas.wrapperEl as HTMLElement).style.backgroundImage = `url(${data.bg})`;
    (canvas.wrapperEl as HTMLElement).style.backgroundSize = "100% 100%";
    suspendRef.current = true;
    canvas.clear();
    if (data.json) await canvas.loadFromJSON(data.json);
    canvas.renderAll();
    suspendRef.current = false;
    data.last = canvas.toJSON() as CanvasJson;
    refreshCounts();
    setHistTick((t) => t + 1);
  }, [refreshCounts]);

  const saveCurrent = useCallback(() => {
    const canvas = fabricRef.current;
    const pd = pagesRef.current[pageIndexRef.current];
    if (canvas && pd) pd.json = canvas.toJSON() as CanvasJson;
  }, []);

  async function goToPage(index: number) {
    if (index < 0 || index >= numPages || index === pageIndexRef.current) return;
    saveCurrent();
    pageIndexRef.current = index;
    setPageIndex(index);
    await loadPage(index);
  }

  useEffect(() => {
    if (stage !== "editor" || !canvasElRef.current || fabricRef.current) return;
    installSelectionTheme();
    const canvas = new Canvas(canvasElRef.current, {
      backgroundColor: "rgba(0,0,0,0)",
      preserveObjectStacking: true,
      selectionColor: "rgba(245,72,44,0.08)",
      selectionBorderColor: "#f5482c",
    });
    fabricRef.current = canvas;
    canvas.on("object:added", (e) => styleRotationControl(e.target));
    canvas.on("object:added", refreshCounts);
    canvas.on("object:added", commitHistory);
    canvas.on("object:modified", commitHistory);
    canvas.on("object:removed", refreshCounts);
    canvas.on("object:removed", commitHistory);
    canvas.on("selection:created", () => setHasSelection(true));
    canvas.on("selection:updated", () => setHasSelection(true));
    canvas.on("selection:cleared", () => setHasSelection(false));
    void loadPage(0);
    return () => {
      void canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stage !== "editor") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const canvas = fabricRef.current;
      if (!canvas) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((mod && key === "y") || (mod && e.shiftKey && key === "z")) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === "c") {
        void copySelected();
        return;
      }
      if (mod && key === "v") {
        void pasteClipboard();
        return;
      }
      const obj = canvas.getActiveObject();
      if ((e.key === "Delete" || e.key === "Backspace") && obj) {
        e.preventDefault();
        canvas.remove(obj);
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, undo, redo, copySelected, pasteClipboard]);

  async function placeSignature(sig: SignatureResult) {
    lastSigRef.current = sig;
    const canvas = fabricRef.current;
    const pd = pagesRef.current[pageIndexRef.current];
    if (!canvas || !pd) return;
    const img = await FabricImage.fromURL(sig.url);
    const targetW = Math.min(pd.displayW * 0.35, 220);
    img.scale(targetW / (img.width || targetW));
    img.set({ left: pd.displayW * 0.1, top: pd.displayH * 0.75 });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  }

  function addText(text: string, opts?: { editing?: boolean }) {
    const canvas = fabricRef.current;
    const pd = pagesRef.current[pageIndexRef.current];
    if (!canvas || !pd) return;
    const tb = new Textbox(text, {
      left: pd.displayW * 0.1,
      top: pd.displayH * 0.7,
      fontSize: 18,
      fill: "#111111",
      fontFamily: "Arial",
    });
    canvas.add(tb);
    canvas.setActiveObject(tb);
    if (opts?.editing) {
      tb.enterEditing();
      tb.selectAll();
    }
    canvas.renderAll();
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (canvas && obj) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }

  async function apply() {
    saveCurrent();
    setProcessing(true);
    setError(null);
    try {
      const overlays: { pageIndex: number; imageFileId: string }[] = [];
      for (const [idxStr, data] of Object.entries(pagesRef.current)) {
        if (!data.json?.objects?.length) continue;
        const idx = Number(idxStr);
        const el = document.createElement("canvas");
        const sc = new StaticCanvas(el, { width: data.displayW, height: data.displayH });
        await sc.loadFromJSON(data.json);
        sc.renderAll();
        const dataUrl = sc.toDataURL({ format: "png", multiplier: 3 });
        void sc.dispose();
        const up = await uploadFile(dataUrlToFile(dataUrl, `sign_${idx}.png`));
        overlays.push({ pageIndex: idx, imageFileId: up.fileId });
      }
      if (overlays.length === 0) {
        setError("Add a signature before applying.");
        return;
      }
      setResult(await processTool(tool.slug, [pdfFileIdRef.current!], { overlays }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

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
      setNumPages(open.numPages);
      setPageIndex(0);
      setStage("editor");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    void openRef.current?.destroy();
    openRef.current = null;
    pagesRef.current = {};
    pageIndexRef.current = 0;
    lastSigRef.current = null;
    setResult(null);
    setStage("upload");
  }

  if (stage === "upload") {
    return (
      <div className="space-y-4">
        {loading ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-3 text-sm text-slate-500">Opening your PDF…</p>
          </div>
        ) : (
          <Dropzone accept={tool.accepts} multiple={false} onFiles={onFile} label="Select a PDF to sign" />
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const activePage = pagesRef.current[pageIndex];
  const canUndo = (activePage?.undo.length ?? 0) > 0;
  const canRedo = (activePage?.redo.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {result && <InlineResult result={result} onReset={reset} title="Signed PDF ready" />}
      {padOpen && (
        <SignaturePad
          onClose={() => setPadOpen(false)}
          onDone={(sig) => {
            setPadOpen(false);
            void placeSignature(sig);
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <div className="mx-auto w-fit shadow-card">
            <canvas ref={canvasElRef} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="font-semibold text-slate-900">Add to page</h2>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setPadOpen(true)}
                className="btn-brand w-full"
              >
                <PenLine className="h-5 w-5" /> Create signature
              </button>
              {lastSigRef.current && (
                <button
                  onClick={() => lastSigRef.current && void placeSignature(lastSigRef.current)}
                  className="w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Place last signature again
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addText(new Date().toLocaleDateString())}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <CalendarDays className="h-4 w-4" /> Date
                </button>
                <button
                  onClick={() => addText("Text", { editing: true })}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Type className="h-4 w-4" /> Text
                </button>
              </div>
              {hasSelection && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void copySelected().then(pasteClipboard)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" /> Duplicate
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" /> Undo
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Y)"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Redo2 className="h-4 w-4" /> Redo
                </button>
              </div>
            </div>
          </div>

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
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Drag your signature to position it, and pull a corner to resize.
              Ctrl+Z/Y undo/redo, Ctrl+C/V copy-paste (across pages), Delete
              removes. Add it to as many pages as you need, then apply.
            </p>
            <RunButton
              label="Apply signature"
              processing={processing}
              disabled={placedCount === 0}
              onClick={apply}
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </aside>
      </div>
    </div>
  );
}
