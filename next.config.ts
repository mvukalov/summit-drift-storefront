import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Baseline for before/after measurement only: IMAGES_UNOPTIMIZED=1 npm run build
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "1",
    remotePatterns: [
      // `search` omitted → any query allowed; these URLs carry `?v=<n>`.
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/1/0926/**" },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/mock-shop-production-media/apparel-outdoor/**",
        search: "",
      },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Sources are 768 px wide; widths above ~828 all encode to 768 and only add cache keys.
    deviceSizes: [640, 750, 828],
    imageSizes: [256, 384],
  },
};

export default nextConfig;
