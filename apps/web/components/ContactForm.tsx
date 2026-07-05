"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { inputCls } from "@/components/tools/ui";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-2xl border border-grass-fg/25 bg-grass-bg p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-grass-fg" />
        <h3 className="mt-3 font-display text-lg font-bold text-ink-900">Message sent</h3>
        <p className="mt-1 text-sm text-ink-600">
          Thanks for reaching out — we&rsquo;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // No mail backend yet — acknowledge locally (wired up in a later phase).
        setSent(true);
      }}
      className="space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-card"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-600">Name</span>
          <input required className={inputCls} placeholder="Your name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink-600">Email</span>
          <input required type="email" className={inputCls} placeholder="you@example.com" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink-600">Message</span>
        <textarea
          required
          rows={5}
          className={`${inputCls} resize-y`}
          placeholder="How can we help?"
        />
      </label>
      <button type="submit" className="btn-brand w-full sm:w-auto">
        <Send className="h-4 w-4" /> Send message
      </button>
    </form>
  );
}
