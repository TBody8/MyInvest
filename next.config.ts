import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "node-cron"],
  reactStrictMode: true,
};

export default nextConfig;
