import type { Metadata } from "next";
import { HelpCircle, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — PDFdecor",
  description: "Get in touch with the PDFdecor team.",
};

const LINKS = [
  { icon: HelpCircle, title: "Check the FAQ", body: "Most questions are answered there.", href: "/faq" },
  { icon: ShieldCheck, title: "Security & privacy", body: "How we handle your files.", href: "/security" },
];

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Get in touch"
      subtitle="Questions, feedback, or a bug to report? Send us a note."
      wide
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <ContactForm />
        </div>
        <aside className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <p className="text-sm text-ink-500">
              We read every message. Since this is an evolving project, response
              times can vary — thanks for your patience.
            </p>
          </div>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:border-brand-200"
            >
              <l.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
              <span>
                <span className="block font-semibold text-ink-900">{l.title}</span>
                <span className="text-sm text-ink-500">{l.body}</span>
              </span>
            </Link>
          ))}
        </aside>
      </div>
    </PageShell>
  );
}
