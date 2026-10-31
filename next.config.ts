import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (solo desarrollo local) trae WASM: no se empaqueta
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
