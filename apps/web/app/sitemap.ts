import type { MetadataRoute } from "next";
import { SITE_URL, sitemapTools } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...["features", "workflows", "faq", "about", "security", "contact"].map(
      (p) => ({
        url: `${SITE_URL}/${p}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }),
    ),
    ...["privacy", "terms"].map((p) => ({
      url: `${SITE_URL}/${p}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const toolPages: MetadataRoute.Sitemap = sitemapTools().map((t) => ({
    url: `${SITE_URL}/${t.slug}`,
    changeFrequency: "weekly",
    priority: t.priority,
  }));

  return [...staticPages, ...toolPages];
}
