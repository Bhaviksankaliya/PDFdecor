"use client";

import { useState } from "react";
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
import { Loader2, Plus, X } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { SidebarCard, Field, RunButton, inputCls } from "./ui";
import { CameraCapture } from "./CameraCapture";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";
import { cn } from "@/lib/cn";

type Img = {
  localId: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  fileId?: string;
};

let counter = 0;
const nextId = () => `img${++counter}`;

function SortableImg({ img, onRemove }: { img: Img; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: img.localId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative cursor-grab touch-none overflow-hidden rounded-lg border bg-white",
        isDragging ? "border-brand-400 shadow-card-hover" : "border-slate-200",
      )}
    >
      <img src={img.previewUrl} alt={img.name} className="aspect-[3/4] w-full object-cover" />
      {img.status === "uploading" && (
        <div className="absolute inset-0 grid place-items-center bg-white/60">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-500 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
        aria-label="Remove image"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ImagesToPdfTool({
  tool,
  withCamera = false,
}: {
  tool: Tool;
  withCamera?: boolean;
}) {
  const [imgs, setImgs] = useState<Img[]>([]);
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState(20);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function addFiles(files: File[]) {
    setError(null);
    for (const file of files) {
      const localId = nextId();
      const previewUrl = URL.createObjectURL(file);
      setImgs((prev) => [...prev, { localId, name: file.name, previewUrl, status: "uploading" }]);
      uploadFile(file)
        .then((res) =>
          setImgs((prev) =>
            prev.map((it) =>
              it.localId === localId ? { ...it, status: "ready", fileId: res.fileId } : it,
            ),
          ),
        )
        .catch((err: Error) => {
          setImgs((prev) =>
            prev.map((it) => (it.localId === localId ? { ...it, status: "error" } : it)),
          );
          setError(err.message);
        });
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setImgs((prev) => {
      const from = prev.findIndex((it) => it.localId === active.id);
      const to = prev.findIndex((it) => it.localId === over.id);
      return arrayMove(prev, from, to);
    });
  }

  function run() {
    const ready = imgs.filter((it) => it.status === "ready" && it.fileId);
    if (!ready.length) {
      setError("Add at least one image.");
      return;
    }
    setProcessing(true);
    setError(null);
    processTool(
      tool.slug,
      ready.map((it) => it.fileId!),
      { pageSize, orientation, margin },
    )
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setProcessing(false));
  }

  const reset = () => {
    setResult(null);
    setImgs([]);
  };

  const readyCount = imgs.filter((it) => it.status === "ready").length;

  return (
    <>
      {result && <InlineResult result={result} onReset={reset} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {imgs.length === 0 ? (
          <>
            <Dropzone accept={tool.accepts} multiple onFiles={addFiles} label="Select images" />
            {withCamera && <CameraCapture onCapture={(f) => addFiles([f])} />}
          </>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={imgs.map((i) => i.localId)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {imgs.map((img) => (
                    <SortableImg
                      key={img.localId}
                      img={img}
                      onRemove={() => setImgs((p) => p.filter((x) => x.localId !== img.localId))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-500 hover:border-brand-300">
                <Plus className="h-4 w-4" /> Add images
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
              {withCamera && <CameraCapture compact onCapture={(f) => addFiles([f])} />}
            </div>
          </>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <SidebarCard title="Layout">
          <Field label="Page size">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as typeof pageSize)}
              className={inputCls}
            >
              <option value="fit">Fit to image</option>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </Field>
          {pageSize !== "fit" && (
            <>
              <Field label="Orientation">
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as typeof orientation)}
                  className={inputCls}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </Field>
              <Field label={`Margin: ${margin}pt`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </Field>
            </>
          )}
          <p className="text-sm text-slate-500">{readyCount} image(s) ready</p>
          <RunButton
            label={tool.title}
            processing={processing}
            disabled={readyCount === 0}
            onClick={run}
          />
        </SidebarCard>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </aside>
      </div>
    </>
  );
}

export function JpgToPdfTool({ tool }: { tool: Tool }) {
  return <ImagesToPdfTool tool={tool} />;
}

export function ScanToPdfTool({ tool }: { tool: Tool }) {
  return <ImagesToPdfTool tool={tool} withCamera />;
}
