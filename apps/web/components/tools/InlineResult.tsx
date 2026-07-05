"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { ProcessResult } from "@/lib/api";
import { cn } from "@/lib/cn";

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** How long the "finalizing" loading state shows before the success reveal. */
const LOADING_MS = 750;

/**
 * Inline success banner shown in place once processing finishes. It first
 * shows a brief loading state ("Finalizing…"), then animates into the
 * success result with the download — so the transition reads as
 * loading → done rather than popping in fully formed.
 *
 * Pass either a `ProcessResult` (server download URL) or an explicit
 * `href`/`filename` for client-side blob downloads.
 */
export function InlineResult({
  result,
  href,
  filename,
  size,
  title = "Your file is ready",
  onReset,
  extra,
}: {
  result?: ProcessResult;
  href?: string;
  filename?: string;
  size?: number;
  title?: string;
  onReset: () => void;
  extra?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  const url = result?.downloadUrl ?? href ?? "#";
  const name = result?.filename ?? filename ?? "result";
  const bytes = result?.size ?? size;

  return (
    <div
      className={cn(
        "animate-result-in mb-5 rounded-2xl border px-4 py-4 transition-colors duration-300",
        ready ? "border-grass-fg/25 bg-grass-bg" : "border-ink-100 bg-white",
      )}
    >
      {!ready ? (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-50 text-brand-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <p className="text-sm font-semibold text-ink-600">Finalizing your file…</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-grass-fg">
              <CheckCircle2 className="animate-pop-in h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-ink-900">{title}</p>
              <p className="truncate text-sm text-ink-600">
                {name}
                {bytes != null ? ` · ${prettySize(bytes)}` : ""}
              </p>
            </div>
            <div className="animate-rise-in flex shrink-0 gap-2">
              <a href={url} download={name} className="btn-brand px-4 py-2.5 text-sm">
                <Download className="h-4 w-4" /> Download
              </a>
              <button onClick={onReset} className="btn-ghost px-4 py-2.5 text-sm">
                <RotateCcw className="h-4 w-4" /> Start over
              </button>
            </div>
          </div>
          {extra}
        </>
      )}
    </div>
  );
}
