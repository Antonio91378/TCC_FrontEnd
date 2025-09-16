import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure node-opcua isn't bundled client-side
      const ext = config.externals;
      if (Array.isArray(ext)) {
        config.externals = [...ext, 'node-opcua'];
      } else if (ext) {
        config.externals = [ext as unknown, 'node-opcua'];
      } else {
        config.externals = ['node-opcua'];
      }
    }
    return config;
  },
};

export default nextConfig;
