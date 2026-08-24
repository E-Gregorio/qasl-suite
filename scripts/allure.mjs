import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const RESULTADOS = "allure-results";
const REPORTE = "allure-report";
const HISTORIA = "allure-history";

const borrar = (...carpetas) => {
  for (const carpeta of carpetas) rmSync(carpeta, { recursive: true, force: true });
};

const acciones = {
  "clean:results": () => borrar(RESULTADOS, "test-results", "playwright-report"),
  clean: () => borrar(RESULTADOS, REPORTE, HISTORIA, "test-results", "playwright-report"),
  "history:restore": () => {
    if (!existsSync(HISTORIA)) return;
    mkdirSync(RESULTADOS, { recursive: true });
    cpSync(HISTORIA, `${RESULTADOS}/history`, { recursive: true });
  },
  "history:save": () => {
    if (!existsSync(`${REPORTE}/history`)) return;
    borrar(HISTORIA);
    cpSync(`${REPORTE}/history`, HISTORIA, { recursive: true });
  },
};

const accion = process.argv[2];
const ejecutar = acciones[accion];

if (!ejecutar) {
  console.error(`Accion desconocida: ${accion}. Opciones: ${Object.keys(acciones).join(", ")}`);
  process.exit(1);
}

ejecutar();
