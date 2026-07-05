"use client";

import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";

export function Dropzone({
  accept,
  multiple,
  onFiles,
  label = "Select files",
}: {
  accept: string[];
  multiple: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
}) {
  const acceptMap: Accept = Object.fromEntries(accept.map((m) => [m, []]));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptMap,
    multiple,
    onDrop: (accepted) => accepted.length && onFiles(accepted),
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20 text-center transition",
        isDragActive
          ? "border-brand-400 bg-brand-50"
          : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
      )}
      role="button"
      tabIndex={0}
      aria-label={label}
    >
      <input {...getInputProps()} />
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand-600">
        <UploadCloud className="h-8 w-8" />
      </span>
      <p className="mt-4 font-display text-xl font-bold text-ink-900">
        {isDragActive ? "Drop your files here" : label}
      </p>
      <p className="mt-1 text-sm text-ink-500">
        or drag &amp; drop {multiple ? "files" : "a file"} to browse from your device
      </p>
    </div>
  );
}
