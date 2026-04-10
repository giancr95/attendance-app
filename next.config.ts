import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained production server at .next/standalone
  // so the Docker image can be tiny (no node_modules at runtime).
  output: "standalone",
};

export default nextConfig;
