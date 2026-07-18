import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production" || process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/Build-Open-Knowledge-Compiler" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
