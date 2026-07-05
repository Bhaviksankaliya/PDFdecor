"use client";

import { useState } from "react";
import JSZip from "jszip";
import { Download, Loader2, RotateCcw } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { Dropzone } from "@/components/Dropzone";
import { InlineResult } from "./InlineResult";
import { SidebarCard, Field, RunButton, inputCls } from "./ui";
import { renderToJpegs } from "@/lib/pdf";

const QUALITY = { low: 1, medium: 2, high: 3 } as const;

export function PdfToJpgTool({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<keyof typeof QUALITY>("medium");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string; count: number } | null>(
    null,
  );

  async function run() {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const jpegs = await renderToJpegs(file, QUALITY[quality]);
      const zip = new JSZip();
      for (const j of jpegs) zip.file(j.name, j.blob);
      const blob = await zip.generateAsync({ type: "blob" });
      setDownload({
        url: URL.createObjectURL(blob),
        name: file.name.replace(/\.pdf$/i, "") + "_images.zip",
        count: jpegs.length,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  const reset = () => {
    setDownload(null);
    setFile(null);
  };

  return (
    <>
      {download && (
        <InlineResult
          href={download.url}
          filename={download.name}
          title={`${download.count} JPG image(s) ready`}
          onReset={reset}
        />
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {file ? (
          <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16">
            {processing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <p className="mt-3 text-sm text-slate-500">Rendering pages…</p>
              </>
            ) : (
              <p className="text-slate-600">{file.name}</p>
            )}
          </div>
        ) : (
          <Dropzone
            accept={tool.accepts}
            multiple={false}
            onFiles={(f) => setFile(f[0] ?? null)}
            label="Select a PDF file"
          />
        )}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <SidebarCard title="Image options">
          <Field label="Quality">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as keyof typeof QUALITY)}
              className={inputCls}
            >
              <option value="low">Low (faster)</option>
              <option value="medium">Medium</option>
              <option value="high">High (sharper)</option>
            </select>
          </Field>
          <RunButton
            label="Convert to JPG"
            processing={processing}
            disabled={!file}
            onClick={run}
          />
        </SidebarCard>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </aside>
      </div>
    </>
  );
}
