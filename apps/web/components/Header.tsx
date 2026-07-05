"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { toolsInCategory, type ToolCategory } from "@pdfforge/config";
import { ToolIcon } from "./ToolIcon";
import { cn } from "@/lib/cn";

// Pricing & auth aren't offered yet — flip to true when they launch.
const SHOW_PRICING_AND_AUTH = false;

type Section = { label: string; cats: ToolCategory[] };

// Mega-menu layout: 3 columns, grouped to match the PDFdecor design.
const MENU_COLUMNS: Section[][] = [
  [
    { label: "Organize", cats: ["organize"] },
    { label: "Optimize", cats: ["optimize"] },
  ],
  [{ label: "Convert", cats: ["convert"] }],
  [
    { label: "Edit", cats: ["edit"] },
    { label: "Security & AI", cats: ["security", "ai"] },
  ],
];

function MenuSection({ section, onNavigate }: { section: Section; onNavigate: () => void }) {
  const tools = section.cats.flatMap((c) => toolsInCategory(c));
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
        {section.label}
      </p>
      <ul className="space-y-0.5">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/${t.slug}`}
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700"
            >
              <ToolIcon name={t.icon} className="h-4 w-4 shrink-0 text-brand-500" />
              <span>{t.title}</span>
              {!t.implemented && (
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-500">
                  Soon
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-grad text-white shadow-brand">
            <ToolIcon name="FileStack" className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink-900">
            PDF<span className="text-brand-500">decor</span>
          </span>
        </Link>

        {/* All tools mega-menu */}
        <div
          className="relative hidden md:block"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
            All tools
            <ChevronDown
              className={cn("h-4 w-4 text-ink-400 transition", open && "rotate-180")}
            />
          </button>
          {/* Wide, viewport-centered panel; pt bridges the gap to the button. */}
          <div
            className={cn(
              "fixed left-1/2 top-12 z-50 w-[min(1140px,calc(100vw-2rem))] -translate-x-1/2 pt-4 transition duration-150",
              open ? "visible opacity-100" : "invisible opacity-0",
            )}
          >
            <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-pop">
              <div className="grid grid-cols-3 gap-x-10 gap-y-6">
                {MENU_COLUMNS.map((col, i) => (
                  <div key={i} className="space-y-6">
                    {col.map((section) => (
                      <MenuSection
                        key={section.label}
                        section={section}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {SHOW_PRICING_AND_AUTH && (
            <>
              <Link
                href="/pricing"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 md:block"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                Log in
              </Link>
            </>
          )}
          {/* Non-functional for now — auth isn't live yet. */}
          <button type="button" className="btn-brand px-4 py-2 text-sm">
            Sign up free
          </button>
        </div>
      </div>

      {/* Full-page blur backdrop while the menu is open. Portaled to <body> so
          it escapes the header's backdrop-filter containing block and covers
          the whole viewport. Sits below the header (z-40) so the bar + menu
          stay sharp; pointer-events-none so it never blocks interaction. */}
      {mounted &&
        createPortal(
          <div
            aria-hidden
            className={cn(
              "pointer-events-none fixed inset-0 z-30 bg-ink-900/10 backdrop-blur-sm transition-opacity duration-200",
              open ? "opacity-100" : "opacity-0",
            )}
          />,
          document.body,
        )}
    </header>
  );
}
