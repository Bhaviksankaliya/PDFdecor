"use client";

import Link from "next/link";
import { CheckCircle2, Download, RotateCcw } from "lucide-react";
import type { ProcessResult } from "@/lib/api";

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResultScreen({
  result,
  onReset,
}: {
  result: ProcessResult;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-grass-bg text-grass-fg">
        <CheckCircle2 className="h-8 w-8" />
      </span>
      <h2 className="mt-4 font-display text-xl font-extrabold text-ink-900">Done!</h2>
      <p className="mt-1 text-sm text-ink-500">
        {result.filename} · {prettySize(result.size)}
      </p>

      <a href={result.downloadUrl} download className="btn-brand mt-6 w-full">
        <Download className="h-5 w-5" />
        Download result
      </a>

      <button onClick={onReset} className="btn-ghost mt-3 w-full">
        <RotateCcw className="h-4 w-4" />
        Start over
      </button>

      <p className="mt-6 text-xs text-ink-400">
        Your files are deleted automatically after 2 hours.{" "}
        <Link href="/" className="text-brand-600 hover:underline">
          Try another tool
        </Link>
      </p>
    </div>
  );
}
