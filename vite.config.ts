import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Deployment target is chosen by NITRO_PRESET at build time (e.g. "vercel",
// "netlify", "cloudflare-module"). Without it we build a portable Node server.
export default defineConfig(({ command }) => ({
  server: { host: "::", port: 8080 },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // inlineDynamicImports keeps the server in one bundle: split SSR chunks
    // import each other and crash at startup ("createCsrfMiddleware is not a function").
    ...(command === "build"
      ? [
          nitro({
            defaultPreset: "node-server",
            inlineDynamicImports: true,
            // Serve .br/.gz copies of static assets built ahead of time.
            compressPublicAssets: { gzip: true, brotli: true },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
