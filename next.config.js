/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // @napi-rs/canvas ships a native .node binary (used server-side to
  // render report chart images) — without this, webpack tries to
  // parse that binary as JS and the whole build fails.
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
};

module.exports = nextConfig;
