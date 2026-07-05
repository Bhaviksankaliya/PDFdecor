import type { Metadata } from "next";
import Link from "next/link";
import {
  Combine,
  Gauge,
  Lock,
  MousePointerClick,
  PenTool,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { TOOLS } from "@pdfforge/config";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Features — PDFdecor",
  description: "Everything PDFdecor can do: organize, optimize, convert, edit, and sign PDFs.",
};

const FEATURES = [
  { icon: Combine, title: "Organize & merge", body: "Merge, split, reorder, rotate, and extract pages with drag-and-drop and live thumbnails." },
  { icon: Gauge, title: "Compress", body: "Shrink file size with Extreme / Recommended / Less presets — and never end up with a bigger file." },
  { icon: RefreshCw, title: "Convert", body: "JPG ↔ PDF and PDF → Word, with more formats on the way." },
  { icon: PenTool, title: "Edit", body: "Add text, shapes, images, highlights, and even edit existing text — then flatten into the PDF." },
  { icon: Sparkles, title: "Sign", body: "Draw, type, or upload a signature, place it on any page, and download a signed PDF." },
  { icon: ScanLine, title: "Scan to PDF", body: "Capture pages with your camera and build a clean PDF on the spot." },
  { icon: Zap, title: "Fast & in-browser", body: "Previews and many tools run entirely in your browser — no waiting on uploads." },
  { icon: ShieldCheck, title: "Auto-delete", body: "Uploaded files and results are automatically removed after 2 hours." },
  { icon: MousePointerClick, title: "No sign-up", body: "Every tool works instantly — no account, no email, no friction." },
];

export default function FeaturesPage() {
  const count = TOOLS.length;
  return (
    <PageShell
      eyebrow="Features"
      title="Everything you need to work with PDFs"
      subtitle={`${count}+ focused tools in one clean workspace — organize, optimize, convert, edit, and secure your documents.`}
      wide
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-500">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display font-bold text-ink-900">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl bg-ink-900 p-6 text-white sm:p-8">
        <div>
          <p className="font-display text-xl font-bold">Ready to try it?</p>
          <p className="mt-1 text-sm text-white/70">Pick a tool and go — nothing to install or sign up for.</p>
        </div>
        <Link href="/" className="btn-brand shrink-0">
          <Lock className="h-4 w-4" /> Browse all tools
        </Link>
      </div>
    </PageShell>
  );
}
