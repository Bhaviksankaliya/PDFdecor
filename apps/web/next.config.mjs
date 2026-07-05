/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow prod builds to run alongside a dev server without sharing .next
  // (e.g. NEXT_DIST_DIR=.next-build npm run build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // @pdfforge/config ships TypeScript source — let Next transpile it.
  transpilePackages: ["@pdfforge/config"],
  webpack: (config) => {
    // The shared package uses NodeNext-style ".js" import specifiers that
    // actually point at ".ts" source. Teach webpack to resolve them.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ...config.resolve.extensionAlias,
    };
    return config;
  },
  async rewrites() {
    const api = "https://pdfdecor.onrender.com";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
