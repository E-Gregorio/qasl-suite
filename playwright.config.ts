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
          issue: { urlTemplate: `${env.qasl.webUrl}/bugs/%s?proyecto=${env.qasl.project}`, nameTemplate: "%s" },
          qasl: { urlTemplate: `${env.qasl.webUrl}/cases/%s?proyecto=${env.qasl.project}` },
          historia: { urlTemplate: `${env.qasl.webUrl}/stories/%s?proyecto=${env.qasl.project}` },
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
            name: "Hallazgos de seguridad",
            messageRegex: "(?s).*Hallazgo de seguridad:.*",
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
    ...(env.qasl.url && env.qasl.token
      ? [
          [
            "./src/core/qasl/qasl-reporter.ts",
            {
              project: env.qasl.project,
              plan: env.qasl.plan,
              environment: `${env.name} · saucedemo.com + dummyjson.com`,
            },
          ] as [string, Record<string, unknown>],
        ]
      : []),
  ],

  use: {
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: env.apiBaseUrl },
    },
    {
      name: "seguridad",
      testDir: "./tests/seguridad",
    },
    {
      name: "e2e-chromium",
      testDir: "./tests/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: env.baseUrl,
        viewport: env.evidencia.pantalla,
        deviceScaleFactor: 1,
        video: { mode: env.evidencia.video, size: env.evidencia.pantalla },
      },
    },
  ],
});
