"use client";

import { useState, type ReactNode } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { uploadFile, processTool, type ProcessResult } from "@/lib/api";

/**
 * One-shot converter: drop a file, it uploads + processes automatically, then
 * shows the download. Used by format conversions that need no configuration.
 */
export function SimpleConvertTool({
  tool,
  actionLabel = "Convert",
  note,
}: {
  tool: Tool;
  actionLabel?: string;
  note?: ReactNode;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "processing">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function run(files: File[]) {
    const file = files[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);
    try {
      setStatus("uploading");
      const up = await uploadFile(file);
      setStatus("processing");
      setResult(await processTool(tool.slug, [up.fileId]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStatus("idle");
    }
  }

  function reset() {
    setResult(null);
    setFileName(null);
    setError(null);
  }

  const busy = status !== "idle";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {result && <InlineResult result={result} onReset={reset} />}
      {!result &&
        (busy ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-ink-200 bg-white py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-3 text-sm font-medium text-ink-600">
              {status === "uploading" ? "Uploading" : "Converting"} {fileName}…
            </p>
          </div>
        ) : (
          <Dropzone
            accept={tool.accepts}
            multiple={false}
            onFiles={run}
            label={`Select a file to ${actionLabel.toLowerCase()}`}
          />
        ))}

      {note && !busy && !result && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{note}</p>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
