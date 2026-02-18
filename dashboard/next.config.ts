import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/Lending_Dashboard_v1" : "",
  images: { unoptimized: true },
};

export default nextConfig;
