import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@pdfforge/config";
import { ToolIcon } from "./ToolIcon";

/** Full tool card used in the "Most popular" and main grids. */
export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group relative flex flex-col rounded-2xl border border-ink-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
    >
      <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-ink-300 transition group-hover:text-brand-500" />
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-500 transition group-hover:bg-brand-grad group-hover:text-white">
        <ToolIcon name={tool.icon} className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-[15px] font-bold text-ink-900">
        {tool.title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
        {tool.description}
      </p>
    </Link>
  );
}

/** Compact card for the "Coming soon" grid — icon + title + SOON badge. */
export function ComingSoonCard({ tool }: { tool: Tool }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white/70 px-3.5 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-400">
        <ToolIcon name={tool.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-600">
        {tool.title}
      </span>
      <span className="pill shrink-0 bg-gold-bg text-gold-fg">Soon</span>
    </div>
  );
}
