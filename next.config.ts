import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./docs/legal/**/*.md"],
  },
};

export default nextConfig;
