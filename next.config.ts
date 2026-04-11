import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// CSP must allow Clerk's JS bundle, turnstile challenges, ImageKit CDN,
// Gemini, Inngest, and (in dev) Next.js HMR websockets. We skip CSP in
// development because Turbopack's HMR + Clerk's dev widget tend to need
// endpoints that change between releases and debugging them one at a time
// makes the dev loop miserable. The other security headers still apply.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: https://img.clerk.com https://ik.imagekit.io https://i.pravatar.cc",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.com https://img.clerk.com https://api.twitter.com https://graph.instagram.com https://ik.imagekit.io https://generativelanguage.googleapis.com https://inngest.com https://*.inngest.com wss://*.clerk.com",
  "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Additional origins the dev server will accept HMR + dev-asset requests
  // from. Next 16 blocks everything except localhost by default, which
  // breaks ngrok tunnels, *.local hostnames, and LAN IP testing. Add any
  // host you browse the dev server through here.
  allowedDevOrigins: [
    "uneffaceable-hauriant-clint.ngrok-free.dev",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
        ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
        : ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
