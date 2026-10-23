import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const CI = !!process.env.CI;

// Smoke tests run against the production build. Public pages need no real
// Supabase project, so placeholder values are used when none are set.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  workers: CI ? 2 : 4,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], ...(CI ? {} : { channel: "chrome" }) },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], ...(CI ? {} : { channel: "chrome" }) },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 240_000,
    env: {
      PORT: String(PORT),
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_placeholder",
      SUPABASE_URL: process.env.SUPABASE_URL ?? "https://placeholder.supabase.co",
      SUPABASE_PUBLISHABLE_KEY:
        process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_placeholder",
      SITE_URL: process.env.SITE_URL ?? `http://localhost:${PORT}`,
      VITE_SITE_URL: process.env.VITE_SITE_URL ?? `http://localhost:${PORT}`,
    },
  },
});
