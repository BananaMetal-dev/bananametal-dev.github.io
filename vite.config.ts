import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  optimizeDeps: { include: ["wasm-media-encoders", "mpg123-decoder"] },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        wavMp3Converter: "apps/wav-mp3-converter/index.html",
        guideVocalPlayer: "apps/guide-vocal-player/index.html",
        bananaMaster: "apps/banana-master/index.html",
      },
    },
  },
});
