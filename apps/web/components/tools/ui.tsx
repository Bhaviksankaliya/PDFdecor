"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <h2 className="font-display font-bold text-ink-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

export function RunButton({
  onClick,
  processing,
  disabled,
  label,
}: {
  onClick: () => void;
  processing: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button onClick={onClick} disabled={processing || disabled} className="btn-brand w-full">
      {processing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> Processing…
        </>
      ) : (
        label
      )}
    </button>
  );
}

const ANCHORS: Anchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

/** 3×3 grid for picking a positional anchor. */
export function AnchorPicker({
  value,
  onChange,
}: {
  value: Anchor;
  onChange: (a: Anchor) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {ANCHORS.map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          aria-label={a}
          className={cn(
            "h-9 rounded-md border transition",
            value === a
              ? "border-brand-500 bg-brand-500"
              : "border-ink-200 bg-ink-50 hover:border-brand-300",
          )}
        >
          <span
            className={cn(
              "mx-auto block h-2 w-2 rounded-full",
              value === a ? "bg-white" : "bg-ink-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}
