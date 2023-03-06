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
        (config.experiments || (config.experiments = {})).topLevelAwait = true;
        return config;
    },
    productionBrowserSourceMaps: true
};
export default nextConfig;
//# sourceMappingURL=next.config.mjs.map