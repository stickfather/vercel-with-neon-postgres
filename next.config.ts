import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip linting during builds in environments where eslint isn't installed.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
