import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Los túneles de VS Code mandan un x-forwarded-host distinto del Origin.
      allowedOrigins:
        process.env.NODE_ENV === "production" ? [] : ["localhost:3000", "127.0.0.1:3000", "**.devtunnels.ms"],
    },
  },
};

export default nextConfig;
