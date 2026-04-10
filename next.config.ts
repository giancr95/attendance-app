import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained production server at .next/standalone
  // so the Docker image can be tiny (no node_modules at runtime).
  output: "standalone",

  // The dev container is exposed on the droplet's public IP for remote
  // browser testing, so HMR resources must be loadable from non-localhost
  // origins. Without this, Next.js 16 silently blocks /_next/webpack-hmr
  // and the client bundle never hydrates — meaning buttons / forms / any
  // client-side state appear dead.
  allowedDevOrigins: [
    "167.71.169.23",
    "localhost",
    "*.sslip.io",
  ],
};

export default nextConfig;
