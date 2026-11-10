import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  workers: 1,
  use: {
    // Optional: use a pre-installed browser instead of `npx playwright install`.
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", locale: "az-AZ",
  },
});
