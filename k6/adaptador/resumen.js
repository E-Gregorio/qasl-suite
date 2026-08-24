import { entorno } from "../config/entorno.js";
import { acuerdoDeServicio } from "../config/umbrales.js";

const SALIDA = __ENV.SALIDA_DIR || "artefactos/k6";

const valorObservado = (metricas, slo) => {
  const metrica = metricas[slo.metrica];
  if (!metrica) return null;
  const valores = metrica.values ?? {};
  if (slo.expresion.startsWith("p(95)")) return valores["p(95)"] ?? null;
  if (slo.expresion.startsWith("p(99)")) return valores["p(99)"] ?? null;
  if (slo.expresion.startsWith("p(90)")) return valores["p(90)"] ?? null;
  if (slo.expresion.startsWith("avg")) return valores.avg ?? null;
  if (slo.expresion.startsWith("med")) return valores.med ?? null;
  if (slo.expresion.startsWith("max")) return valores.max ?? null;
  if (slo.expresion.startsWith("rate")) return valores.rate ?? null;
  if (slo.expresion.startsWith("count")) return valores.count ?? null;
  return null;
};

const evaluar = (slo, observado) => {
  if (observado === null) return null;
  return slo.comparador === "menor" ? observado < slo.limite : observado > slo.limite;
};

const margen = (slo, observado, cumple) => {
  if (observado === null || slo.limite === 0) return null;
  const diferencia =
    slo.comparador === "menor" ? slo.limite - observado : observado - slo.limite;
  return Number(((diferencia / slo.limite) * 100).toFixed(1)) * (cumple ? 1 : -1) * (cumple ? 1 : -1);
};

export const resumen = (datos, perfil) => {
  const metricas = datos.metrics ?? {};

  const umbrales = acuerdoDeServicio.map((slo) => {
    const observado = valorObservado(metricas, slo);
    const cumple = evaluar(slo, observado);
    return {
      id: slo.id,
      descripcion: slo.descripcion,
      metrica: slo.metrica,
      expresion: slo.expresion,
      limite: slo.limite,
      unidad: slo.unidad,
      comparador: slo.comparador,
      severidad: slo.severidad,
      observado: observado === null ? null : Number(observado.toFixed(3)),
      cumple,
      desviacionPct:
        observado === null || slo.limite === 0
          ? null
          : Number((((observado - slo.limite) / slo.limite) * 100).toFixed(1)),
    };
  });

  const incumplidos = umbrales.filter((u) => u.cumple === false);
  const bloqueantes = incumplidos.filter((u) => u.severidad === "blocker" || u.severidad === "critical");

  const dictamen =
    incumplidos.length === 0
      ? "APROBADO"
      : bloqueantes.length > 0
        ? "NO APROBADO"
        : "APROBADO CON OBSERVACIONES";

  const salida = {
    version: "1.0.0",
    identificacion: {
      proyecto: entorno.proyecto,
      codigoFuncional: entorno.codigoFuncional,
      tipoDePrueba: entorno.tipoDePrueba,
      ambiente: entorno.nombre,
      sut: entorno.baseUrl,
      herramienta: "k6",
      responsable: entorno.responsable,
    },
    perfil: {
      descripcion: perfil.descripcion,
      etapas: perfil.etapas,
    },
    dictamen: { resultado: dictamen, umbrales },
    crudo: metricas,
  };

  return {
    [`${SALIDA}/resumen.json`]: JSON.stringify(salida, null, 2),
    stdout: `\n  Dictamen: ${dictamen}\n  Umbrales incumplidos: ${incumplidos.length} de ${umbrales.length}\n\n`,
  };
};
