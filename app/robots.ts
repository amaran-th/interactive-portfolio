import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/pretext", "/knit-muffler", "/sitemap.xml", "/sitemap-0.xml"],
        disallow: ["/"],
      },
    ],
    sitemap: `${process.env.SITE_URL || "https://example.com"}/sitemap.xml`,
  };
}
