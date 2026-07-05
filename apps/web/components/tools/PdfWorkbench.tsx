"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Loader2, RotateCw, Trash2, GripVertical } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { renderThumbnails, type PageThumb } from "@/lib/pdf";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";
import { cn } from "@/lib/cn";

export type PageMode = "none" | "view" | "select" | "organize";

/** Context handed to a tool's options sidebar. */
export type WorkbenchCtx = {
  pageCount: number;
  /** Sorted 0-based indices currently checked (select mode). */
  selected: number[];
  /** Ordered source indices + rotations (organize mode). */
  order: number[];
  rotations: Record<number, number>;
  processing: boolean;
  /** Submit options to the API and show the result. */
  run: (options: Record<string, unknown>) => void;
};

function SortablePage({
  thumb,
  rotation,
  onRotate,
  onDelete,
}: {
  thumb: PageThumb;
  rotation: number;
  onRotate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: thumb.index });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative rounded-lg border bg-white p-1.5",
        isDragging ? "border-brand-400 shadow-card-hover" : "border-slate-200",
      )}
    >
      <div className="absolute left-1 top-1 z-10 flex gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded bg-white/80 p-1 text-slate-500 hover:text-slate-800"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute right-1 top-1 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onRotate}
          className="rounded bg-white/80 p-1 text-slate-500 hover:text-brand-600"
          aria-label="Rotate page"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded bg-white/80 p-1 text-slate-500 hover:text-red-600"
          aria-label="Delete page"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <img
        src={thumb.dataUrl}
        alt={`Page ${thumb.index + 1}`}
        style={{ transform: `rotate(${rotation}deg)` }}
        className="mx-auto block h-auto w-full rounded transition-transform"
      />
      <p className="mt-1 text-center text-xs text-slate-400">{thumb.index + 1}</p>
    </div>
  );
}

export function PdfWorkbench({
  tool,
  mode,
  sidebar,
  intro,
  pageOverlay,
}: {
  tool: Tool;
  mode: PageMode;
  sidebar: (ctx: WorkbenchCtx) => ReactNode;
  intro?: ReactNode;
  /** Optional live overlay drawn over each page thumbnail (e.g. watermark preview). */
  pageOverlay?: (thumb: PageThumb) => ReactNode;
}) {
  const [fileId, setFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [order, setOrder] = useState<number[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onFile = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setLoading(true);
      try {
        const [up, rendered] = await Promise.all([
          uploadFile(file),
          mode === "none" ? Promise.resolve(null) : renderThumbnails(file),
        ]);
        setFileId(up.fileId);
        if (rendered) {
          setThumbs(rendered.thumbs);
          setPageCount(rendered.pageCount);
          setOrder(rendered.thumbs.map((t) => t.index));
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [mode],
  );

  function run(options: Record<string, unknown>) {
    if (!fileId) return;
    setProcessing(true);
    setError(null);
    processTool(tool.slug, [fileId], options)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setProcessing(false));
  }

  function reset() {
    setResult(null);
    setFileId(null);
    setThumbs([]);
    setPageCount(0);
    setSelected(new Set());
    setOrder([]);
    setRotations({});
    setError(null);
  }

  if (!fileId) {
    return (
      <div className="space-y-4">
        {intro}
        {loading ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-3 text-sm text-slate-500">Loading your PDF…</p>
          </div>
        ) : (
          <Dropzone
            accept={tool.accepts}
            multiple={false}
            onFiles={onFile}
            label="Select a PDF file"
          />
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  const ctx: WorkbenchCtx = {
    pageCount,
    selected: [...selected].sort((a, b) => a - b),
    order,
    rotations,
    processing,
    run,
  };

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.indexOf(active.id as number);
      const to = prev.indexOf(over.id as number);
      return arrayMove(prev, from, to);
    });
  }

  return (
    <>
      {result && <InlineResult result={result} onReset={reset} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {mode === "organize" ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={order} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {order.map((idx) => {
                  const thumb = thumbs.find((t) => t.index === idx)!;
                  return (
                    <SortablePage
                      key={idx}
                      thumb={thumb}
                      rotation={rotations[idx] ?? 0}
                      onRotate={() =>
                        setRotations((r) => ({ ...r, [idx]: ((r[idx] ?? 0) + 90) % 360 }))
                      }
                      onDelete={() => setOrder((o) => o.filter((x) => x !== idx))}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : mode === "none" ? null : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {thumbs.map((t) => {
              const isSel = selected.has(t.index);
              const selectable = mode === "select";
              return (
                <button
                  key={t.index}
                  onClick={
                    selectable
                      ? () =>
                          setSelected((s) => {
                            const n = new Set(s);
                            n.has(t.index) ? n.delete(t.index) : n.add(t.index);
                            return n;
                          })
                      : undefined
                  }
                  className={cn(
                    "relative rounded-lg border bg-white p-1.5 text-left transition",
                    selectable && "hover:border-brand-300",
                    isSel ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200",
                  )}
                >
                  {selectable && (
                    <span
                      className={cn(
                        "absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full border",
                        isSel
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-slate-300 bg-white",
                      )}
                    >
                      {isSel && <Check className="h-3 w-3" />}
                    </span>
                  )}
                  <div className="relative">
                    <img
                      src={t.dataUrl}
                      alt={`Page ${t.index + 1}`}
                      className="mx-auto block h-auto w-full rounded"
                    />
                    {pageOverlay && (
                      <div className="pointer-events-none absolute inset-0">
                        {pageOverlay(t)}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-center text-xs text-slate-400">{t.index + 1}</p>
                </button>
              );
            })}
          </div>
        )}
        {mode === "none" && intro}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {sidebar(ctx)}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <p className="px-1 text-xs text-slate-400">
          🔒 Files are processed securely and auto-deleted after 2 hours.
        </p>
      </aside>
      </div>
    </>
  );
}
