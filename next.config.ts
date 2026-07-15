import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdf-parse (and the pdfjs-dist it wraps) out of the server bundle so
  // its Node-native worker resolution works unmodified at runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
