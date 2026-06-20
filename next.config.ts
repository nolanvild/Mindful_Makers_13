import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plant photos are served directly from Supabase Storage public URLs via
  // plain <img> tags, so no next/image remotePatterns config is needed.
};

export default nextConfig;
