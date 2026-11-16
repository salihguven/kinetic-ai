/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.KINETIC_BUILD_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    ...(process.env.KINETIC_BUILD_WORKERS
      ? {
          cpus: Math.max(1, Number(process.env.KINETIC_BUILD_WORKERS) || 1),
          staticGenerationMaxConcurrency: 1,
          staticGenerationMinPagesPerWorker: 1000,
        }
      : {}),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
