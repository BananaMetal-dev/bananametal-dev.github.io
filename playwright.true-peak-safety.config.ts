import { defineConfig } from "@playwright/test";

// Reuses the local 5190 development server during the full-length safety batch.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5190", channel: "chrome", trace: "retain-on-failure" },
});
