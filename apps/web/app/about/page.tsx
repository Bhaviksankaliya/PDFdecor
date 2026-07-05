import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Lock, Zap } from "lucide-react";
import { PageShell, Prose } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "About — PDFdecor",
  description: "What PDFdecor is and the principles behind it.",
};

const VALUES = [
  { icon: Zap, title: "Fast & focused", body: "Each tool does one thing well, with no clutter or upsells in the way." },
  { icon: Lock, title: "Private by default", body: "No accounts required, and your files are deleted automatically after 2 hours." },
  { icon: Heart, title: "Free to use", body: "The core tools are free — do the job and move on." },
];

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="PDF tools that respect your time"
      subtitle="PDFdecor brings the everyday PDF tools you actually use into a single, clean workspace."
    >
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-500">
              <v.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display font-bold text-ink-900">{v.title}</h3>
            <p className="mt-1 text-sm text-ink-500">{v.body}</p>
          </div>
        ))}
      </div>

      <Prose>
        <p>
          PDFdecor is an independent project built to make working with PDFs
          quick and painless. Instead of hunting across a dozen sites — one to
          merge, another to compress, another to convert — everything lives in
          one place with a consistent, no-nonsense interface.
        </p>
        <h2>How it works</h2>
        <p>
          Wherever possible, tools run right in your browser. Page previews,
          thumbnails, and conversions like PDF → JPG happen locally, so nothing
          leaves your device. When a tool does need to process on the server,
          your file is handled temporarily and then automatically deleted.
        </p>
        <h2>An honest note</h2>
        <p>
          This is an actively evolving project. Some tools are marked
          &ldquo;Soon&rdquo; while they&rsquo;re being built, and features like
          accounts and saved workflows are on the roadmap. What&rsquo;s live
          today is ready to use — no sign-up needed.
        </p>
        <p>
          Have a question? Check the <Link href="/faq">FAQ</Link>.
        </p>
      </Prose>
    </PageShell>
  );
}
