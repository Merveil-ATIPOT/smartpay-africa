import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@smartpay/contracts", "@smartpay/design-tokens"],
  outputFileTracingRoot: path.join(configDir, "../.."),
  devIndicators: false,
};

export default nextConfig;
