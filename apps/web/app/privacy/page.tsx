import type { Metadata } from "next";
import { PageShell, Prose } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Privacy — PDFdecor",
  description: "How PDFdecor collects, uses, and retains data.",
};

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy"
      title="Privacy policy"
      subtitle="Plain-language summary of what we do — and don't do — with your data."
    >
      <Prose>
        <p>
          This policy explains how PDFdecor handles information when you use the
          tools on this site. We aim to collect as little as possible.
        </p>

        <h2>Files you upload</h2>
        <p>
          When a tool processes on the server, your file is stored temporarily
          only to perform the requested operation, then deleted automatically
          within 2 hours. Many tools run entirely in your browser and never
          upload your file at all. We do not read, share, or sell the contents
          of your documents.
        </p>

        <h2>Accounts</h2>
        <p>
          PDFdecor currently works without accounts, so we don&rsquo;t collect
          names, emails, or passwords to use the tools. If you submit the
          contact form, we use the details you provide only to reply to you.
        </p>

        <h2>Usage data</h2>
        <p>
          Like most websites, basic technical information (such as your browser
          type and general request logs) may be processed to keep the service
          running and secure. We do not use this to build advertising profiles.
        </p>

        <h2>Cookies</h2>
        <p>
          The core tools do not require tracking cookies to function. If
          analytics or preferences are added later, this page will be updated to
          describe them.
        </p>

        <h2>Third parties</h2>
        <p>
          We don&rsquo;t sell your data. Any infrastructure providers used to
          host the service only process data on our behalf to run PDFdecor.
        </p>

        <h2>Changes</h2>
        <p>
          As the project evolves, this policy may be updated. Material changes
          will be reflected here.
        </p>
      </Prose>
    </PageShell>
  );
}
