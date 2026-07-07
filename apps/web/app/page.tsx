import { Sparkles } from "lucide-react";
import { HomeGrid } from "@/components/HomeGrid";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Free online PDF tools — edit, merge, split, compress, convert, sign, and watermark PDF files in your browser.",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative">
        <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-14 text-center sm:px-6 sm:pt-20">
          <span className="pill mx-auto mb-6 w-fit bg-white text-ink-600 shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            30+ free PDF tools · No sign-up required
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
            Free online <span className="text-brand-500">PDF tools</span> to
            <br className="hidden sm:block" /> edit, merge &amp; convert
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-500">
            Edit PDF files free — merge, split, compress, convert, sign, and
            watermark your documents online. Fast, private, and no account
            required.
          </p>
        </div>
      </section>
      <HomeGrid />
    </>
  );
}
