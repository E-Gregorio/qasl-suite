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
          // @TestCase("HU-001|TS-01|TC-01") → abre el caso en QASL Manual Testing
          qasl: { urlTemplate: `${env.qasl.webUrl}/cases/%s?proyecto=${env.qasl.project}` },
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
    // QASL Manual Testing: publica cada resultado en su caso y abre el bug si falla.
    // Se activa solo cuando el pipeline (o tu terminal) define QASL_URL y QASL_TOKEN.
    ...(env.qasl.url && env.qasl.token
      ? [
          [
            "./src/core/qasl/qasl-reporter.ts",
            {
              project: env.qasl.project,
              plan: env.qasl.plan,
              environment: `${env.name} · saucedemo.com + fakestoreapi.com`,
            },
          ] as [string, Record<string, unknown>],
        ]
      : []),
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
