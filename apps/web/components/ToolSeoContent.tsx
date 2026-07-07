import type { Tool } from "@pdfforge/config";
import { getToolSeo, SITE_URL, SITE_NAME } from "@/lib/seo";

/**
 * Crawlable SEO block rendered below each tool: how-to steps, feature
 * bullets, and FAQs — mirrored into JSON-LD (SoftwareApplication, HowTo,
 * FAQPage, BreadcrumbList) so Google can show rich results.
 */
export function ToolSeoContent({ tool }: { tool: Tool }) {
  const seo = getToolSeo(tool);
  const url = `${SITE_URL}/${tool.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${tool.title} — ${SITE_NAME}`,
      url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      description: seo.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to use ${tool.title} online free`,
      step: seo.steps.map((text, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        text,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PDF Tools", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: tool.title, item: url },
      ],
    },
  ];

  return (
    <section className="mx-auto mt-14 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h2 className="font-display text-2xl font-bold text-ink-900">
        How to use {tool.title} online free
      </h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-600">
        {seo.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <h2 className="mt-10 font-display text-2xl font-bold text-ink-900">
        Why use {SITE_NAME}?
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-600">
        <li>100% free — no sign-up, no watermark, no trial limits.</li>
        <li>Private by design — files are encrypted in transit and auto-deleted after 2 hours.</li>
        <li>Works everywhere — Windows, Mac, Linux, Android, and iPhone, right in your browser.</li>
        <li>No software to install — no Adobe Acrobat needed.</li>
      </ul>

      <h2 className="mt-10 font-display text-2xl font-bold text-ink-900">
        Frequently asked questions
      </h2>
      <div className="mt-4 space-y-6">
        {seo.faqs.map((f) => (
          <div key={f.q}>
            <h3 className="font-semibold text-ink-900">{f.q}</h3>
            <p className="mt-1 text-ink-600">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
