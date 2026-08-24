import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TIPO = process.env.TIPO_PRUEBA || "estres";
const ORIGEN = `k6/demo/metricas-${TIPO}.json`;
const DIRECTORIO = process.env.SALIDA_DIR || "artefactos/k6";
const DESTINO = `${DIRECTORIO}/metricas.json`;

if (!existsSync(ORIGEN)) {
  console.error(`No existe ${ORIGEN}. Corridas de ejemplo disponibles en k6/demo/`);
  process.exit(1);
}

mkdirSync(dirname(DESTINO), { recursive: true });
copyFileSync(ORIGEN, DESTINO);

console.log(`corrida de ejemplo "${TIPO}" sembrada en ${DESTINO}`);
