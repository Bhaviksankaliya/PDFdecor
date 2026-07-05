import type { Metadata } from "next";
import { PageShell, Prose } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Terms — PDFdecor",
  description: "The terms for using PDFdecor.",
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of use"
      subtitle="The basic rules for using PDFdecor. By using the site, you agree to these terms."
    >
      <Prose>
        <h2>Using the service</h2>
        <p>
          PDFdecor provides tools to work with PDF and image files. You may use
          them for lawful purposes and only with files you have the right to
          process. Don&rsquo;t use the service to handle content that is illegal,
          infringing, or that you don&rsquo;t have permission to modify.
        </p>

        <h2>Your files &amp; responsibility</h2>
        <p>
          You are responsible for the files you upload and the results you
          download. Always keep your own copy of important documents — processed
          files are temporary and deleted automatically after 2 hours, and we
          can&rsquo;t recover them for you afterward.
        </p>

        <h2>Availability</h2>
        <p>
          This is an evolving project. Tools may change, be added, or be
          temporarily unavailable, and some features are still in development.
          We don&rsquo;t guarantee uninterrupted access.
        </p>

        <h2>No warranty</h2>
        <p>
          The service is provided &ldquo;as is,&rdquo; without warranties of any
          kind. While we aim for accurate results, conversions and edits are
          best-effort and may vary with complex documents. Review your output
          before relying on it.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, PDFdecor is not liable for any loss or
          damage arising from use of the service, including lost files or data.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Don&rsquo;t attempt to disrupt, overload, or reverse-engineer the service.</li>
          <li>Don&rsquo;t use automated means to abuse the tools or exceed reasonable limits.</li>
          <li>Don&rsquo;t upload malware or content that violates others&rsquo; rights.</li>
        </ul>

        <h2>Changes</h2>
        <p>
          These terms may be updated over time. Continued use of the service
          means you accept the current version.
        </p>
      </Prose>
    </PageShell>
  );
}
