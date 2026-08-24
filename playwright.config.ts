import { defineConfig, devices } from "@playwright/test";
import { env } from "@core/config/env";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    [
      "allure-playwright",
      {
        resultsDir: "allure-results",
        detail: true,
        suiteTitle: false,
        links: {
          issue: { urlTemplate: env.links.issueUrlTemplate, nameTemplate: "%s" },
          tms: { urlTemplate: env.links.tmsUrlTemplate, nameTemplate: "TC %s" },
        },
        environmentInfo: {
          Entorno: env.name,
          Base_URL: env.baseUrl,
          API_URL: env.apiBaseUrl,
          Node: process.version,
          Rama: process.env.GITHUB_REF_NAME ?? "local",
          Commit: process.env.GITHUB_SHA?.slice(0, 8) ?? "local",
        },
        categories: [
          {
            name: "Fallos de infraestructura",
            messageRegex: ".*(ECONNREFUSED|ETIMEDOUT|net::ERR|ENOTFOUND).*",
            matchedStatuses: ["broken"],
          },
          {
            name: "Selectores rotos",
            messageRegex: ".*(locator|strict mode violation|waiting for selector).*",
            matchedStatuses: ["failed", "broken"],
          },
          {
            name: "Contrato de API",
            messageRegex: ".*(Se esperaba \\d{3}|schema|toMatchObject).*",
            matchedStatuses: ["failed"],
          },
          {
            name: "Degradacion de performance",
            messageRegex: ".*(Tardo \\d+ ms|Timeout .* exceeded).*",
            matchedStatuses: ["failed", "broken"],
          },
        ],
      },
    ],
  ],

  use: {
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: env.apiBaseUrl },
    },
    {
      name: "e2e-chromium",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: env.baseUrl },
    },
  ],
});
