import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HTTPS only for two years (browsers ignore it on plain http / localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // A deliberately small CSP: it does not restrict scripts, images or media (so nothing existing can break), but it
  // blocks clickjacking, <base> hijacking, plugin embeds and forms that post to another site.
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  // The platform is per-user and request-time (sessions, timed exams), so we use
  // conventional dynamic rendering instead of Cache Components.
  poweredByHeader: false,
  // Lets several dev servers run side by side (NEXT_DIST_DIR=.next-b next dev -p 3102).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Photo / avatar uploads (max 3 MB) travel inside Server Action requests.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  serverExternalPackages: ["argon2", "pg", "@prisma/client"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
