import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        wavMp3Converter: "apps/wav-mp3-converter/index.html",
        guideVocalPlayer: "apps/guide-vocal-player/index.html",
      },
    },
  },
});
