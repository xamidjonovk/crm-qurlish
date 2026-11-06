import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:18765",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "uv run python run_demo.py",
    cwd: "../backend",
    url: "http://127.0.0.1:18765/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
