import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: '**.clerk.accounts.dev' },
      { protocol: 'https', hostname: '**.clerk.com' },
      { protocol: 'https', hostname: 'www.artic.edu' },
      { protocol: 'https', hostname: 'datasets-server.huggingface.co' },
    ],
    localPatterns: [
      { pathname: '/api/image-proxy', search: '?*' },
      { pathname: '/echoLogo.png' },
    ],
  },
};

export default nextConfig;
