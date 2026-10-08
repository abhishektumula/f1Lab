// The one place the site's name, copy and address are defined. Set NEXT_PUBLIC_SITE_URL to the
// deployed address so canonical links, the sitemap and social previews point at the right place.
const fromEnv =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export const SITE_URL = (fromEnv ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE = {
  name: "F1 Lab",
  title: "F1 Lab: drive a Formula 1 car around your screen",
  description:
    "Drive a Formula 1 car around your screen with the arrow keys. Burn donuts, leave tyre marks, crash, and pit to repair. A browser lab built with Next.js.",
  keywords: [
    "F1",
    "Formula 1",
    "browser game",
    "car game",
    "drifting",
    "donuts",
    "top-down racing",
    "HTML canvas",
    "interactive",
    "Next.js",
  ],
  themeColor: "#3a3c40",
};
