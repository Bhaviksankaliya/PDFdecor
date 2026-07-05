import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { LIMITS } from "@pdfforge/config";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "FAQ — PDFdecor",
  description: "Answers to common questions about PDFdecor.",
};

const MB = LIMITS.maxFileSize / 1024 / 1024;

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is PDFdecor free?",
    a: "Yes. The core tools are free to use, with no account required.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Every available tool works instantly without signing up. Accounts (for saving files and workflows) are on the roadmap.",
  },
  {
    q: "What happens to my files?",
    a: "Many tools run entirely in your browser, so those files never leave your device. When a tool processes on the server, your upload and the result are stored temporarily and deleted automatically after 2 hours.",
  },
  {
    q: "Is there a file size limit?",
    a: `Yes — uploads are currently limited to ${MB} MB per file.`,
  },
  {
    q: "Which tools run in my browser vs. the server?",
    a: "Previews, thumbnails, and PDF → JPG run locally in your browser. Tools like Merge, Compress, Edit, Sign, and PDF → Word send the file to the server for processing, then it's auto-deleted.",
  },
  {
    q: "Will the quality of my PDF change?",
    a: "Editing and signing keep your original PDF intact and only add your changes on top. Compression re-renders pages as images to shrink size, so it works best on scanned or image-heavy PDFs — and it never returns a file larger than your original.",
  },
  {
    q: "Can I edit the text that's already in a PDF?",
    a: "Yes — the Edit tool can detect existing text; click a line to replace it. Font matching is best-effort, so complex layouts may shift slightly.",
  },
  {
    q: "Do you support scanned PDFs?",
    a: "You can view and annotate them, but text-based tools (like PDF → Word) need selectable text. OCR for scanned documents is coming soon.",
  },
];

export default function FaqPage() {
  return (
    <PageShell
      eyebrow="FAQ"
      title="Frequently asked questions"
      subtitle="Short, honest answers about how PDFdecor works."
    >
      <div className="space-y-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-ink-100 bg-white px-5 shadow-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-semibold text-ink-900">
              {item.q}
              <ChevronDown className="h-5 w-5 text-ink-400 transition group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-ink-500">{item.a}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
