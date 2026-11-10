import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["browser.spec.js", "training-pdfs.spec.js"],
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4173/fox-sales-resource-center/",
    browserName: "chromium",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (process.env.CI ? undefined : "/usr/bin/chromium"),
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
