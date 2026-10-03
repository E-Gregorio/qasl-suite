/**
 * Reporter de Playwright para QASL Manual Testing.
 *
 * Asocia cada test con su caso de prueba y, al terminar la corrida,
 * publica los resultados en la API. Si un test falla, sube su evidencia (captura, video, traza)
 * y la plataforma abre el bug solo. Detecta GitLab CI, GitHub Actions y Azure Pipelines.
 *
 * El caso se indica con la referencia de NEXUS, de cualquiera de estas formas:
 *   test('…', { tag: '@HU-002|TS-03|TC-09' }, …)                         tag
 *   test('…', { annotation: { type: 'case', description: 'HU-002|TS-03|TC-09' } }, …)   anotación
 *   un caso creado a mano en la plataforma: tag @TC-0001
 *
 * Uso en playwright.config.ts:
 *   reporter: [['list'], ["./src/core/qasl/qasl-reporter.ts", { project: "TIENDA", plan: "PLAN-01" }]]
 *
 * Variables de entorno (tienen prioridad sobre las opciones):
 *   QASL_URL, QASL_TOKEN, QASL_PROJECT, QASL_PLAN, QASL_ENVIRONMENT
 */
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

type Outcome = 'pass' | 'fail' | 'blocked' | 'not_run';

interface Options {
  url?: string;
  token?: string;
  project?: string;
  plan?: string;
  environment?: string;
  /** Qué tags representan un caso. Por defecto la referencia NEXUS (@HU-002|TS-03|TC-09) o @TC-… */
  casePattern?: RegExp;
  /** Subir evidencia: solo de los tests que fallan (por defecto), siempre o nunca. */
  uploadAttachments?: 'on-failure' | 'always' | 'never';
  /** Si es true, un error al publicar hace fallar el job. */
  strict?: boolean;
}

interface Collected {
  caseKey: string;
  outcome: Outcome;
  duration: number;
  error?: string;
  test: string;
  files: { name: string; path: string; contentType: string }[];
}

const ANSI = /\u001b\[[0-9;]*m/g;
const MAX_FILE_MB = 50;

function pipelineInfo() {
  const env = process.env;
  if (env.GITLAB_CI) {
    return { id: env.CI_PIPELINE_ID!, url: env.CI_PIPELINE_URL, branch: env.CI_COMMIT_REF_NAME, commit: env.CI_COMMIT_SHA };
  }
  if (env.GITHUB_ACTIONS) {
    return {
      id: env.GITHUB_RUN_ID!, url: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
      branch: env.GITHUB_REF_NAME, commit: env.GITHUB_SHA,
    };
  }
  if (env.TF_BUILD) {
    return {
      id: env.BUILD_BUILDID!, url: `${env.SYSTEM_COLLECTIONURI}${env.SYSTEM_TEAMPROJECT}/_build/results?buildId=${env.BUILD_BUILDID}`,
      branch: env.BUILD_SOURCEBRANCHNAME, commit: env.BUILD_SOURCEVERSION,
    };
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  return { id: `local-${stamp}`, branch: env.QASL_BRANCH ?? 'local', commit: env.QASL_COMMIT };
}

/**
 * "login.spec.ts › Login de usuarios › rechaza el login: password vacia".
 * Se arma con el título y no con test.location: las suites declaradas con decoradores
 * registran los tests desde el runner, y la ubicación apuntaría a ese archivo.
 */
function testName(test: TestCase): string {
  const [, , file, ...rest] = test.titlePath();
  return [path.basename(file ?? test.location.file), ...rest].filter(Boolean).join(' › ');
}

const toOutcome = (status: TestResult['status']): Outcome =>
  status === 'passed' ? 'pass' : status === 'skipped' ? 'not_run' : 'fail';

export default class QaslReporter implements Reporter {
  private readonly opts: Required<Pick<Options, 'casePattern' | 'uploadAttachments'>> & Options;
  private readonly results = new Map<string, Collected[]>();
  private untagged = 0;

  constructor(options: Options = {}) {
    this.opts = {
      casePattern: /^@((?:[A-Z][\w-]*\|){1,2}TC[\w-]+|TC-[\w-]+)$/i,
      uploadAttachments: 'on-failure',
      ...options,
      url: process.env.QASL_URL ?? options.url,
      token: process.env.QASL_TOKEN ?? options.token,
      project: process.env.QASL_PROJECT ?? options.project,
      plan: process.env.QASL_PLAN ?? options.plan,
      environment: process.env.QASL_ENVIRONMENT ?? options.environment,
      strict: process.env.QASL_STRICT === '1' || options.strict,
    };
  }

  private caseKeys(test: TestCase): string[] {
    const tags = [...(test.tags ?? []), ...(test.title.match(/@[\w|-]+/g) ?? [])];
    const fromTags = tags.map((t) => t.match(this.opts.casePattern)?.[1]);
    const fromAnnotations = test.annotations.filter((a) => a.type === 'case' || a.type === 'qasl-case').map((a) => a.description?.replace(/\s+/g, ''));
    return [...new Set([...fromTags, ...fromAnnotations].filter(Boolean).map((k) => k!.toUpperCase()))];
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const keys = this.caseKeys(test);
    if (!keys.length) { this.untagged += 1; return; }
    const outcome = toOutcome(result.status);
    const upload = this.opts.uploadAttachments === 'always' || (this.opts.uploadAttachments === 'on-failure' && outcome === 'fail');
    const entry: Collected = {
      caseKey: '',
      outcome,
      duration: result.duration,
      error: result.error?.message?.replace(ANSI, '').slice(0, 4000),
      test: testName(test),
      files: upload ? result.attachments.filter((a) => a.path).map((a) => ({ name: path.basename(a.path!), path: a.path!, contentType: a.contentType })) : [],
    };
    // Con reintentos, cuenta el último intento del test
    for (const caseKey of keys) this.results.set(`${test.id}|${caseKey}`, [{ ...entry, caseKey }]);
  }

  private async upload(file: Collected['files'][number]): Promise<number | null> {
    try {
      const info = await stat(file.path);
      if (info.size > MAX_FILE_MB * 1024 * 1024) return null;
      const res = await fetch(`${this.opts.url}/api/projects/${encodeURIComponent(this.opts.project!)}/attachments?name=${encodeURIComponent(file.name)}&by=pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': file.contentType || 'application/octet-stream' },
        body: await readFile(file.path),
      });
      return res.ok ? ((await res.json()) as { id: number }).id : null;
    } catch {
      return null;
    }
  }

  async onEnd(_result: FullResult) {
    const { url, token, project } = this.opts;
    if (!url || !token || !project) {
      console.log('\n[QASL] Sin QASL_URL, QASL_TOKEN o QASL_PROJECT: los resultados no se publican.');
      return;
    }
    const collected = [...this.results.values()].flat();
    if (!collected.length) {
      console.log('\n[QASL] Ningún test indica su caso (@HU-…|TS-…|TC-… o anotación case). No hay nada para publicar.');
      return;
    }

    const pipeline = pipelineInfo();
    try {
      const results = [];
      for (const r of collected) {
        const attachments = (await Promise.all(r.files.map((f) => this.upload(f)))).filter((id): id is number => id !== null);
        results.push({ case: r.caseKey, outcome: r.outcome, duration_ms: Math.round(r.duration), error: r.error, test: r.test, attachments });
      }
      const res = await fetch(`${url}/api/projects/${encodeURIComponent(project)}/automation/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: this.opts.plan, environment: this.opts.environment, pipeline, results }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `La API respondió ${res.status}`);

      const d = body.defects ?? {};
      console.log(`\n[QASL] Publicado en ${project} como ${body.run} (pipeline ${pipeline.id}): ${body.results} casos.`);
      if (d.created?.length) console.log(`[QASL] Bugs nuevos: ${d.created.join(', ')}`);
      if (d.updated?.length) console.log(`[QASL] Bugs que siguen fallando: ${d.updated.join(', ')}`);
      if (d.closed?.length) console.log(`[QASL] Bugs cerrados por el pipeline: ${d.closed.join(', ')}`);
      if (d.ready_for_retest?.length) console.log(`[QASL] Bugs listos para retest: ${d.ready_for_retest.join(', ')}`);
      if (body.unknown_cases?.length) console.log(`[QASL] Tags sin caso en QASL: ${body.unknown_cases.join(', ')}`);
      if (this.untagged) console.log(`[QASL] ${this.untagged} test(s) sin tag de caso no se publicaron.`);
    } catch (error) {
      console.error(`\n[QASL] No se pudieron publicar los resultados: ${(error as Error).message}`);
      if (this.opts.strict) return { status: 'failed' as const };
    }
  }

  printsToStdio() {
    return false;
  }
}
