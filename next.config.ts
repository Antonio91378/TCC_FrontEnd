import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure node-opcua isn't bundled client-side
      config.externals = [...(config.externals as any[] || []), 'node-opcua'];
    }
    return config;
  },
};

export default nextConfig;
