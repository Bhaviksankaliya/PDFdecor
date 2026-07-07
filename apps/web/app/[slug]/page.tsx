import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import { getTool, TOOLS } from "@pdfforge/config";
import { ToolIcon } from "@/components/ToolIcon";
import { ToolRenderer } from "@/components/tools/ToolRenderer";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { getToolSeo, SITE_NAME } from "@/lib/seo";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const tool = getTool(params.slug);
  if (!tool) return { title: "Tool not found" };
  const seo = getToolSeo(tool);
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: `/${tool.slug}` },
    openGraph: {
      title: `${seo.title} | ${SITE_NAME}`,
      description: seo.description,
      url: `/${tool.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    // Unbuilt tools render a "coming soon" shell — keep them crawlable but
    // don't let a thin page compete with the real ones.
    robots: tool.implemented ? undefined : { index: false, follow: true },
  };
}

export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = getTool(params.slug);
  if (!tool) notFound();

  return (
    <>
      {/* Dark workspace bar */}
      <div className="bg-ink-900 text-white">
        <div className="mx-auto flex h-12 max-w-6xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All tools
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="pill bg-white/10 text-white/90">
              <Zap className="h-3.5 w-3.5 text-brand-300" /> In your browser
            </span>
            <span className="pill bg-white/10 text-white/90">
              <ShieldCheck className="h-3.5 w-3.5 text-grass-fg" /> Deleted after 2h
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Tool hero */}
        <div className="mb-7 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-grad text-white shadow-brand">
            <ToolIcon name={tool.icon} className="h-7 w-7" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink-900">
              {tool.title}
            </h1>
            <p className="mt-0.5 text-ink-500">{tool.description}</p>
          </div>
        </div>

        <ToolRenderer tool={tool} />

        <ToolSeoContent tool={tool} />
      </div>
    </>
  );
}
