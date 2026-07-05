import type { Metadata } from "next";
import { Clock, MonitorSmartphone, ShieldCheck, UserX } from "lucide-react";
import { PageShell, Prose } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Security — PDFdecor",
  description: "How PDFdecor handles your files.",
};

const POINTS = [
  { icon: Clock, title: "Auto-deleted after 2 hours", body: "Uploaded files and results are removed automatically — nothing is kept long term." },
  { icon: MonitorSmartphone, title: "Local when possible", body: "Previews and several tools run entirely in your browser, so those files never leave your device." },
  { icon: UserX, title: "No account needed", body: "We don't ask you to sign up, so there's no profile or history tied to you." },
  { icon: ShieldCheck, title: "Minimal data", body: "We only handle the file you give a tool, for as long as it takes to process it." },
];

export default function SecurityPage() {
  return (
    <PageShell
      eyebrow="Security"
      title="Your files, handled with care"
      subtitle="A straightforward look at how PDFdecor processes and protects your documents."
    >
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
              <p.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-ink-900">{p.title}</h3>
              <p className="mt-0.5 text-sm text-ink-500">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Prose>
        <h2>Where your files go</h2>
        <p>
          Many tools — including page previews, thumbnails, and PDF → JPG — run
          entirely in your browser. In those cases your file never reaches our
          servers at all. Tools like Merge, Compress, Edit, Sign, and PDF → Word
          upload the file, process it, and return the result.
        </p>
        <h2>How long we keep it</h2>
        <p>
          Server-processed files (both your upload and the output) are stored
          temporarily under a random identifier and deleted automatically after
          2 hours by a routine that runs on the server.
        </p>
        <h2>Transport</h2>
        <p>
          In production, all traffic is served over HTTPS, so data is encrypted
          in transit between your browser and the server.
        </p>
        <h2>What we&rsquo;re still improving</h2>
        <p>
          In the interest of being transparent: this is an evolving project.
          At-rest encryption of temporarily-stored files and hardened storage
          are on the roadmap, not fully in place yet. If your documents are
          highly sensitive, prefer the browser-only tools, which never upload
          your file.
        </p>
      </Prose>
    </PageShell>
  );
}
