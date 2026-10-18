import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A production build must not overwrite files used by a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};
export default nextConfig;
