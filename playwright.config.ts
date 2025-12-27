import { defineConfig, devices } from "@playwright/test";

const isDocker = !!process.env.DEVCONTAINER;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limit workers in Docker to prevent CPU exhaustion
  workers: process.env.CI ? 1 : isDocker ? 2 : undefined,
  reporter: "html",
  // Shorter timeout for offline-only app
  timeout: 10000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Reduce action timeout for snappy offline app
    actionTimeout: 5000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Docker-optimized Chromium settings
        launchOptions: {
          args: isDocker ? ["--disable-gpu", "--no-sandbox"] : [],
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
