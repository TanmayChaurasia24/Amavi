/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure server-only modules don't leak to client
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
