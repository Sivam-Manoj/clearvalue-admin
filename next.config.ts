import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow all remote images since gallery images come from various sources (R2, S3, etc.)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
    // Also allow unoptimized images for the transform API
    unoptimized: false,
  },
};

export default nextConfig;
