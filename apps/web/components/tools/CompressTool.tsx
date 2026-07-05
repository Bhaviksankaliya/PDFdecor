"use client";

import { useState } from "react";
import { Download, Loader2, Minimize2, RotateCcw } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { renderForCompress } from "@/lib/pdf";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";
import { cn } from "@/lib/cn";

type PresetKey = "extreme" | "recommended" | "less";

const PRESETS: Record<
  PresetKey,
  { label: string; blurb: string; scale: number; quality: number }
> = {
  extreme: { label: "Extreme", blurb: "Smallest file, lower quality", scale: 1.0, quality: 0.45 },
  recommended: { label: "Recommended", blurb: "Good balance of size & quality", scale: 1.5, quality: 0.6 },
  less: { label: "Less", blurb: "Higher quality, larger file", scale: 2.0, quality: 0.8 },
};

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function CompressTool({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<PresetKey>("recommended");
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function compress() {
    if (!file) return;
    setError(null);
    const { scale, quality } = PRESETS[preset];
    try {
      // Progress budget: upload 0-8%, render 8-55%, optimize 55-93%, rebuild 93-100%.
      setStatus("Uploading your file…");
      setProgress(2);
      const original = await uploadFile(file);
      setProgress(8);

      setStatus("Rendering pages…");
      const pages = await renderForCompress(file, scale, quality, (done, total) => {
        setProgress(8 + Math.round((done / total) * 47));
        setStatus(`Rendering page ${done} of ${total}…`);
      });

      setStatus("Optimizing pages…");
      let uploaded = 0;
      const parts = await Promise.all(
        pages.map(async (p, i) => {
          const up = await uploadFile(
            new File([p.blob], `page_${i}.jpg`, { type: "image/jpeg" }),
          );
          uploaded += 1;
          setProgress(55 + Math.round((uploaded / pages.length) * 38));
          setStatus(`Optimizing pages… (${uploaded}/${pages.length})`);
          return { imageFileId: up.fileId, widthPt: p.widthPt, heightPt: p.heightPt };
        }),
      );

      setStatus("Rebuilding PDF…");
      setProgress(95);
      const res = await processTool(tool.slug, [original.fileId], { pages: parts });
      setProgress(100);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStatus(null);
      setProgress(0);
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setError(null);
  }

  // ── Inline result banner with before/after ──
  const resultBanner =
    result && file
      ? (() => {
          const before = file.size;
          const after = result.size;
          const pct = before > 0 ? Math.round((Math.max(0, before - after) / before) * 100) : 0;
          const noGain = after >= before;
          return (
            <div className="animate-result-in rounded-2xl border border-grass-fg/25 bg-grass-bg p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-grass-fg">
                  <Minimize2 className="animate-pop-in h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-ink-900">
                    {noGain ? "Already optimized" : `${pct}% smaller`}
                  </p>
                  <p className="text-sm text-ink-600">
                    {prettySize(before)} → <span className="font-semibold">{prettySize(after)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={result.downloadUrl} download className="btn-brand px-4 py-2.5 text-sm">
                    <Download className="h-4 w-4" /> Download
                  </a>
                  <button onClick={reset} className="btn-ghost px-4 py-2.5 text-sm">
                    <RotateCcw className="h-4 w-4" /> Start over
                  </button>
                </div>
              </div>
              {/* before/after bars */}
              <div className="mt-3 space-y-1.5">
                <div className="h-2 rounded-full bg-white/70">
                  <div className="h-2 rounded-full bg-ink-300" style={{ width: "100%" }} />
                </div>
                <div className="h-2 rounded-full bg-white/70">
                  <div
                    className="h-2 rounded-full bg-grass-fg"
                    style={{ width: `${Math.max(6, Math.round((after / before) * 100))}%` }}
                  />
                </div>
              </div>
              {noGain && (
                <p className="mt-2 text-xs text-ink-600">
                  This PDF is mostly text, so image compression couldn’t shrink it further —
                  your original file is provided unchanged.
                </p>
              )}
            </div>
          );
        })()
      : null;

  const busy = status !== null;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {resultBanner}
      {!file ? (
        <Dropzone accept={tool.accepts} multiple={false} onFiles={(f) => setFile(f[0] ?? null)} label="Select a PDF to compress" />
      ) : busy ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14">
          <div className="mx-auto max-w-sm text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-500" />
            <p className="mt-4 text-sm font-medium text-slate-700">{status}</p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(3, progress)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-brand-600">{progress}%</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="truncate text-sm font-medium text-slate-700">{file.name}</span>
            <span className="ml-3 shrink-0 text-sm text-slate-400">{prettySize(file.size)}</span>
          </div>

          <div className="space-y-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setPreset(k)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  preset === k ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300",
                )}
              >
                <div>
                  <p className="font-semibold text-slate-800">{PRESETS[k].label}</p>
                  <p className="text-xs text-slate-500">{PRESETS[k].blurb}</p>
                </div>
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full border-2",
                    preset === k ? "border-brand-500" : "border-slate-300",
                  )}
                >
                  {preset === k && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
                </span>
              </button>
            ))}
          </div>

          <button onClick={compress} className="btn-brand w-full">
            Compress PDF
          </button>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Compression re-renders pages as images, so it works best on scanned
            or image-heavy PDFs. Text becomes non-selectable. If it can’t reduce
            the size, your original file is returned unchanged.
          </p>
        </>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
