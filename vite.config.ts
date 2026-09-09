import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const isCapacitorBuild = process.env.BUILD_TARGET === "capacitor";

export default defineConfig({
  define: {
    __CAPACITOR_BUILD__: isCapacitorBuild,
  },
  plugins: [
    react(),
    ...(isCapacitorBuild
      ? []
      : [
          VitePWA({
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
            registerType: "autoUpdate",
            includeAssets: [
              "favicon.png",
              "icon-192.webp",
              "icon-512.webp",
              "icons/**/*",
            ],
            manifest: {
              id: "/",
              name: "Summits",
              short_name: "Summits",
              description:
                "Track mountain peaks, routes, and challenges with Summits.",
              start_url: "/",
              scope: "/",
              display: "standalone",
              orientation: "portrait",
              background_color: "#000000",
              theme_color: "#000000",
              icons: [
                {
                  src: "/icon-192.webp",
                  sizes: "192x192",
                  type: "image/webp",
                },
                {
                  src: "/icon-512.webp",
                  sizes: "512x512",
                  type: "image/webp",
                },
              ],
            },
            devOptions: {
              enabled: true,
            },
            injectManifest: {
              globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,json}"],
              maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
            },
          }),
        ]),
  ],
  server: {
    host: true,
    port: 5173,
    hmr: {
      port: 5173,
      host: "localhost",
    },
  },
  preview: {
    host: true,
    port: 5173,
  },
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
  build: {
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'DYNAMIC_IMPORT') return;
        warn(warning);
      },
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": ["firebase/app", "firebase/auth"],
          "vendor-mapbox": ["mapbox-gl"],
          "vendor-leaflet": ["leaflet"],
          "vendor-ui": ["@mui/material", "@emotion/react", "@emotion/styled", "recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-capacitor": [
            "@capacitor/core",
            "@capacitor/app",
            "@capacitor/geolocation",
            "@capacitor/preferences",
            "@capacitor/push-notifications",
            "@capacitor/filesystem",
            "@capacitor/status-bar",
            "@capacitor/splash-screen",
          ],
          "vendor-icons": ["lucide-react"],
          "vendor-socket": ["socket.io-client"],
          "vendor-swiper": ["swiper"],
          "vendor-lightbox": ["yet-another-react-lightbox"],
          "vendor-headless": ["@headlessui/react"],
        },
      },
    },
  },
});
