import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Perfil em /@handle. Pastas com @ são slots no App Router, então a página
  // mora em /perfil/[handle] e o endereço curto é reescrito para ela.
  async rewrites() {
    return [{ source: "/@:handle", destination: "/perfil/:handle" }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
