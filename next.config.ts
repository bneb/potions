import type { NextConfig } from "next";

// Deployed to GitHub Pages at https://bneb.github.io/potions/, so assets need
// the "/potions" base path in production. Local `next dev` stays at the root.
const isProd = process.env.NODE_ENV === "production";
const repo = "potions";

const nextConfig: NextConfig = {
  output: "export", // static HTML/CSS/JS in ./out — no server needed
  basePath: isProd ? `/${repo}` : "",
  images: { unoptimized: true }, // Image Optimization needs a server; export can't
  trailingSlash: true, // emit /path/index.html so deep links resolve on Pages
};

export default nextConfig;
