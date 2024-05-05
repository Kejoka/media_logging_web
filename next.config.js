const runtimeCaching = require("next-pwa/cache");

const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        disableDevLogs: true,
    },
    pwa: {
        runtimeCaching,
        buildExcludes: [/middleware-manifest.json$/]
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false
};

module.exports = withPWA(nextConfig);