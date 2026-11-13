import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "browser.spec.js",
    "training-pdfs.spec.js",
    "chevrolet-guides.spec.js",
  ],
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4173/fox-sales-resource-center/",
    browserName: "chromium",
    launchOptions: {
      // Use Playwright's pinned browser locally and in CI; override only explicitly.
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4173/fox-sales-resource-center/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
