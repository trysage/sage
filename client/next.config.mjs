/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      // Privy v3 optional deps — not used in this app
      "@farcaster/mini-app-solana": false,
      "@solana-program/memo": false,
    };
    return config;
  },
};

export default nextConfig;
