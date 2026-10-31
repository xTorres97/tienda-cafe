import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (solo desarrollo local) trae WASM: no se empaqueta
  serverExternalPackages: ["@electric-sql/pglite"],
  // Las migraciones SQL se leen en tiempo de ejecución desde la ruta de reset
  outputFileTracingIncludes: { "/api/cron/reset": ["./drizzle/**/*"] },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
