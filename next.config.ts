import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  serverExternalPackages: ['pdfkit', 'heic-convert'],
};

export default nextConfig;
