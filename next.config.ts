import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis uses Node.js built-ins that aren't available in edge runtime
  serverExternalPackages: ["googleapis"],
};

export default nextConfig;
