import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Exclude supabase edge functions from type checking (they use Deno)
    ignoreBuildErrors: false,
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
