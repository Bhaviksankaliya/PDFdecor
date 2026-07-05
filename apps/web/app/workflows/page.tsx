import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Combine, Gauge, Stamp, Workflow } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Workflows — PDFdecor",
  description: "Chain multiple PDF tools into a reusable, one-click pipeline.",
};

const EXAMPLE = [
  { icon: Combine, label: "Merge" },
  { icon: Gauge, label: "Compress" },
  { icon: Stamp, label: "Watermark" },
];

export default function WorkflowsPage() {
  return (
    <PageShell
      eyebrow="Workflows"
      title="Chain tools into one click"
      subtitle="Run several PDF tools in a row, automatically. Set up a pipeline once, then reuse it whenever you need it."
    >
      <span className="pill mb-8 inline-flex bg-gold-bg text-gold-fg">Coming soon</span>

      {/* Example pipeline */}
      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <p className="text-sm font-semibold text-ink-500">Example pipeline</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {EXAMPLE.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5">
                <step.icon className="h-4 w-4 text-brand-500" />
                <span className="text-sm font-semibold text-ink-700">{step.label}</span>
              </div>
              {i < EXAMPLE.length - 1 && <ArrowRight className="h-4 w-4 text-ink-300" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-500">
          Drop in a file and it flows through every step — no repeating yourself.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Build once", "Arrange tools in the order you want and save the pipeline."],
          ["Reuse anytime", "Run the same sequence on new files with a single click."],
          ["Stay consistent", "Every document gets the exact same treatment, every time."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <Workflow className="h-5 w-5 text-brand-500" />
            <h3 className="mt-3 font-display font-bold text-ink-900">{t}</h3>
            <p className="mt-1 text-sm text-ink-500">{b}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-ink-500">
        Workflows are in the works. In the meantime, all{" "}
        <Link href="/" className="font-medium text-brand-600 hover:underline">
          individual tools
        </Link>{" "}
        are ready to use.
      </p>
    </PageShell>
  );
}
