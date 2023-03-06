/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn2.scratch.mit.edu",
        port: "",
        pathname: "/get_image/user/**"
      }
    ]
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source"
    });
    return config;
  }
};

export default nextConfig;
