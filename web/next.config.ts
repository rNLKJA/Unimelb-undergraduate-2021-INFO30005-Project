import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The committed SQLite snapshot and the SQL migrations are read from disk at
  // runtime (see src/db/client.ts), so make sure they ship with every
  // serverless function on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./data/seed.db", "./drizzle/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
