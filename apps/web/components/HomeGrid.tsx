"use client";

import { useMemo, useState } from "react";
import { Flame, Hourglass, Lock, Search, Sparkles, Zap } from "lucide-react";
import { CATEGORIES, TOOLS, getTool, type ToolCategory } from "@pdfforge/config";
import { ToolCard, ComingSoonCard } from "./ToolCard";
import { cn } from "@/lib/cn";

type Tab = "all" | ToolCategory;

const POPULAR = ["merge-pdf", "split-pdf", "compress-pdf", "jpg-to-pdf", "pdf-to-word", "edit-pdf"];

const TRUST = [
  { icon: Zap, label: "Files deleted after 2h" },
  { icon: Lock, label: "Private & encrypted" },
  { icon: Sparkles, label: "No sign-up needed" },
];

export function HomeGrid() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      TOOLS.filter((t) => {
        if (tab !== "all" && t.category !== tab) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        );
      }),
    [tab, q],
  );

  const available = filtered.filter((t) => t.implemented);
  const soon = filtered.filter((t) => !t.implemented);
  const popular = POPULAR.map((s) => getTool(s)).filter((t): t is NonNullable<typeof t> => !!t);
  const showExtras = tab === "all" && !q; // popular + coming-soon only in the default view

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    ...CATEGORIES.map((c) => ({ id: c.id as Tab, label: c.label.replace(" PDF", "") })),
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Search */}
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search 30+ tools — try "compress" or "word"'
            aria-label="Search tools"
            className="w-full rounded-2xl border border-ink-200 bg-white py-4 pl-12 pr-4 text-[15px] shadow-card outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs font-medium text-ink-500">
          {TRUST.map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1.5">
              <t.icon className="h-3.5 w-3.5 text-grass-fg" />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Most popular */}
      {showExtras && (
        <div className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
            <Flame className="h-5 w-5 text-brand-500" /> Most popular
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-12 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              tab === t.id
                ? "bg-brand-grad text-white shadow-brand"
                : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main grid */}
      {available.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : (
        !showExtras && (
          <p className="py-12 text-center text-ink-400">No available tools match “{query}”.</p>
        )
      )}

      {/* Coming soon */}
      {(showExtras ? TOOLS.filter((t) => !t.implemented) : soon).length > 0 && (
        <div className="mb-16 mt-14">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink-500">
            <Hourglass className="h-4 w-4" /> Coming soon
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {(showExtras ? TOOLS.filter((t) => !t.implemented) : soon).map((tool) => (
              <ComingSoonCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
