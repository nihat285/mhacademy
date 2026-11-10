import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Next.js injects small inline scripts, so script-src needs 'unsafe-inline'
 * (a nonce-based policy would require per-request rendering of every page). The other directives still
 * block the important things: plugins, <base> hijacking, form posts to other sites, framing by other
 * sites, and embedding anything but the video providers the app supports.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https:",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The platform is per-user and request-time (sessions, timed exams), so we use
  // conventional dynamic rendering instead of Cache Components.
  poweredByHeader: false,
  // Lets several dev servers run side by side (NEXT_DIST_DIR=.next-b next dev -p 3102).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Photo / avatar uploads (max 3 MB) travel inside Server Action requests.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  serverExternalPackages: ["argon2", "pg"],
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
