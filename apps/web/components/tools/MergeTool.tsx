"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";
import { getPdfPageCount } from "@/lib/pdf";
import { cn } from "@/lib/cn";

type Item = {
  localId: string;
  name: string;
  size: number;
  pages: number | null;
  status: "uploading" | "ready" | "error";
  fileId?: string;
  error?: string;
};

let counter = 0;
const nextId = () => `f${++counter}`;

function prettySize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Row({
  item,
  index,
  count,
  onRemove,
  onMove,
}: {
  item: Item;
  index: number;
  count: number;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.localId });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white p-3",
        isDragging ? "border-brand-300 shadow-card-hover" : "border-ink-100 shadow-card",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="grid h-8 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg bg-brand-grad text-sm font-bold text-white"
      >
        {index + 1}
      </button>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-800">{item.name}</p>
        <p className="text-xs text-ink-400">
          {item.status === "uploading" && "Uploading…"}
          {item.status === "error" && (
            <span className="text-red-500">{item.error ?? "Upload failed"}</span>
          )}
          {item.status === "ready" &&
            `${item.pages != null ? `${item.pages} page${item.pages === 1 ? "" : "s"} · ` : ""}${prettySize(item.size)}`}
        </p>
      </div>
      {item.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-ink-400" />}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move up"
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label="Move down"
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 disabled:opacity-30"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export function MergeTool({ tool }: { tool: Tool }) {
  const [items, setItems] = useState<Item[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function addFiles(files: File[]) {
    setError(null);
    const max = tool.maxFiles ?? 30;
    const accepted = files.slice(0, Math.max(0, max - items.length));
    for (const file of accepted) {
      const localId = nextId();
      setItems((prev) => [
        ...prev,
        { localId, name: file.name, size: file.size, pages: null, status: "uploading" },
      ]);
      uploadFile(file)
        .then((res) =>
          setItems((prev) =>
            prev.map((it) =>
              it.localId === localId
                ? { ...it, status: "ready", fileId: res.fileId, size: res.size }
                : it,
            ),
          ),
        )
        .catch((err: Error) =>
          setItems((prev) =>
            prev.map((it) =>
              it.localId === localId ? { ...it, status: "error", error: err.message } : it,
            ),
          ),
        );
      // Page count in parallel (best-effort).
      getPdfPageCount(file)
        .then((pages) =>
          setItems((prev) =>
            prev.map((it) => (it.localId === localId ? { ...it, pages } : it)),
          ),
        )
        .catch(() => {});
    }
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }
  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      return arrayMove(prev, index, to);
    });
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) =>
      arrayMove(
        prev,
        prev.findIndex((it) => it.localId === active.id),
        prev.findIndex((it) => it.localId === over.id),
      ),
    );
  }

  async function merge() {
    const ready = items.filter((it) => it.status === "ready" && it.fileId);
    if (ready.length < 2) {
      setError("Add at least two PDFs to merge.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      setResult(await processTool(tool.slug, ready.map((it) => it.fileId!)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  const reset = () => {
    setResult(null);
    setItems([]);
  };

  const readyCount = items.filter((it) => it.status === "ready").length;
  const totalPages = items.reduce((s, it) => s + (it.pages ?? 0), 0);
  const totalSize = items.reduce((s, it) => s + it.size, 0);
  const anyUploading = items.some((it) => it.status === "uploading");

  return (
    <>
      {result && <InlineResult result={result} onReset={reset} title="Merged PDF ready" />}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Files & order */}
      <div>
        {items.length > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink-900">Files &amp; order</h2>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
              <Plus className="h-4 w-4" /> Add more
              <input
                type="file"
                multiple
                accept={tool.accepts.join(",")}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        {items.length === 0 ? (
          <Dropzone accept={tool.accepts} multiple onFiles={addFiles} label="Drop your PDFs here" />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={items.map((it) => it.localId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2.5">
                {items.map((it, i) => (
                  <Row
                    key={it.localId}
                    item={it}
                    index={i}
                    count={items.length}
                    onRemove={() => removeItem(it.localId)}
                    onMove={(dir) => move(i, dir)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Merge options */}
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display font-bold text-ink-900">Merge options</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ["Files selected", String(readyCount)],
              ["Total pages", totalPages > 0 ? String(totalPages) : "—"],
              ["Combined size", totalSize > 0 ? prettySize(totalSize) : "—"],
              ["Output", "merged.pdf"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-ink-500">{label}</dt>
                <dd className="font-bold text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="my-4 border-t border-ink-100" />
          <p className="text-xs leading-relaxed text-ink-500">
            💡 Drag rows or use arrows to reorder. Files combine top to bottom.
          </p>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={merge}
            disabled={processing || anyUploading || readyCount < 2}
            className="btn-brand mt-4 w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Merging…
              </>
            ) : readyCount >= 2 ? (
              `Merge ${readyCount} files`
            ) : (
              "Merge PDF"
            )}
          </button>
          {readyCount < 2 && !processing && (
            <p className="mt-2 text-center text-xs text-ink-400">
              Add at least two files to continue
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 rounded-xl bg-grass-bg px-4 py-3 text-sm font-medium text-grass-fg">
          <ShieldCheck className="h-4 w-4" />
          Encrypted &amp; auto-deleted after 2 hours
        </div>
      </aside>
      </div>
    </>
  );
}
