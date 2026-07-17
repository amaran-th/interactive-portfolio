import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/pretext", "/gpu-rotation", "/knit-muffler", "/visual-novel-studio", "/stellar-forge", "/yearly-receipt", "/nemo-nemo-beam", "/sitemap.xml", "/sitemap-0.xml"],
        disallow: ["/"],
      },
    ],
    sitemap: `${process.env.SITE_URL || "https://amaran-th-interactive-portfolio.vercel.app"}/sitemap.xml`,
  };
}
