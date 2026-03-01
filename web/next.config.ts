import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workaround for Next.js 16 bug with /_global-error prerender
  // See: https://github.com/vercel/next.js/issues/84994
  experimental: {
    // Disable static generation for error pages to avoid useContext null error
    staticGenerationRetryCount: 0,
  },
  async headers() {
    return [
      {
        // Garante que o manifest.json seja servido com o Content-Type correto
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Garante que o service worker seja servido sem cache
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        // Ícones PWA com cache longo
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
