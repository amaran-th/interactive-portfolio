import type { NextConfig } from "next";

const PORTFOLIO_ORIGINS = [
  "https://amaranth-portfolio.vercel.app",
  "http://localhost:3000",
  ...(process.env.EXTRA_FRAME_ANCESTORS?.split(/\s+/).filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${PORTFOLIO_ORIGINS.join(" ")}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
