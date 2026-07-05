"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { ToolIcon } from "@/components/ToolIcon";

const PERKS = [
  "Save your recent files & results",
  "Build reusable tool workflows",
  "Higher size limits & batch processing",
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    // No auth backend yet — capture intent client-side (Phase 5 will wire this up).
    setJoined(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-grad text-white shadow-brand">
          <ToolIcon name="FileStack" className="h-6 w-6" />
        </span>

        {joined ? (
          <div className="mt-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-grass-bg text-grass-fg">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
              You’re on the list!
            </h1>
            <p className="mt-2 text-ink-500">
              Accounts are launching soon — we’ll email{" "}
              <span className="font-semibold text-ink-700">{email}</span> the moment
              they’re ready. Meanwhile, every tool is free and needs no sign-up.
            </p>
            <Link href="/" className="btn-brand mt-6 w-full">
              Explore all tools <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-ink-900">
              Create your free account
            </h1>
            <p className="mt-1.5 text-ink-500">
              Accounts are coming soon. Every tool already works with{" "}
              <span className="font-semibold text-ink-700">no sign-up required</span> —
              join the list to get early access.
            </p>

            <ul className="mt-5 space-y-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-ink-600">
                  <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
                  {perk}
                </li>
              ))}
            </ul>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button type="submit" className="btn-brand w-full">
                Join the early access list
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-500">
              Just need a tool?{" "}
              <Link href="/" className="font-semibold text-brand-600 hover:underline">
                Browse all tools
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
