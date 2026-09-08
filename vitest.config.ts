import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/wav-mp3/**/*.test.ts",
      "src/guide-vocal-player/**/*.test.ts",
    ],
    testTimeout: 30_000,
  },
});
