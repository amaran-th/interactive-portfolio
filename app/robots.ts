import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/", "/playground", "/interaction-lab", "/engineering-note"],
      },
    ],
    sitemap: `${process.env.SITE_URL || "https://example.com"}/sitemap.xml`,
  };
}
