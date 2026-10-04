import "dotenv/config";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";

const leer = (clave) => {
  const valor = process.env[clave];
  if (!valor) {
    console.error(`Falta la variable de entorno ${clave}. Copia .env.example a .env`);
    process.exit(1);
  }
  return valor;
};

const perfil = process.argv[2] ?? leer("PERF_PERFIL");
const SALIDA = "artefactos/k6";
const PUERTO = leer("PERF_SUT_PORT");
const SUT = `http://localhost:${PUERTO}`;

const correr = (titulo, comando, argumentos, entorno = {}) => {
  console.log(`\n  ── ${titulo}\n`);
  const resultado = spawnSync(comando, argumentos, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...entorno },
  });
  return resultado.status ?? 1;
};

const esperarSut = async () => {
  for (let intento = 0; intento < 40; intento += 1) {
    try {
      const respuesta = await fetch(`${SUT}/api/catalogo`);
      if (respuesta.status < 500) return true;
    } catch {
      await new Promise((listo) => setTimeout(listo, 250));
    }
  }
  return false;
};

mkdirSync(SALIDA, { recursive: true });
rmSync(`${SALIDA}/resumen.json`, { force: true });

const servidor = spawn(process.execPath, ["k6/sut-demo/servidor.js"], {
  stdio: "ignore",
  env: { ...process.env, SUT_PORT: PUERTO },
});

let codigo = 0;
try {
  if (!(await esperarSut())) {
    console.error(`\n  El SUT de rendimiento no respondio en ${SUT}.\n`);
    process.exitCode = 1;
  } else {
    codigo = correr(
      `Corrida k6 · perfil ${perfil}`,
      "k6",
      ["run", `--out json=${SALIDA}/crudo.json`, "k6/escenarios/recorrido.js"],
      {
        TIPO_PRUEBA: perfil,
        SUT_BASE_URL: SUT,
        ENV_NAME: leer("ENV_NAME"),
        PROYECTO: leer("PERF_PROYECTO"),
        CODIGO_FUNCIONAL: leer("PERF_CODIGO"),
        RESPONSABLE: leer("RESPONSABLE"),
      },
    );

    if (!existsSync(`${SALIDA}/resumen.json`)) {
      console.error("\n  La corrida de k6 no dejo resumen. No se puede armar el informe.\n");
      process.exitCode = codigo || 1;
    } else if (correr("Adaptacion de las metricas", "node", ["k6/adaptador/adaptar.mjs"]) !== 0) {
      process.exitCode = 1;
    } else {
      correr("Informe de rendimiento", "node", ["k6/informe/informe.mjs"]);
      correr("Publicacion en Allure", "node", ["k6/adaptador/puente-allure.mjs"]);
    }
  }
} finally {
  servidor.kill();
}
