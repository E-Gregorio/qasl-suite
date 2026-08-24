const leer = (clave, porDefecto) => {
  const valor = __ENV[clave];
  if (valor === undefined || valor === "") {
    if (porDefecto === undefined) {
      throw new Error(`Falta la variable de entorno ${clave}`);
    }
    return porDefecto;
  }
  return valor;
};

export const entorno = {
  nombre: leer("ENV_NAME", "local"),
  baseUrl: leer("SUT_BASE_URL", "http://localhost:4300"),
  proyecto: leer("PROYECTO", "QASL"),
  codigoFuncional: leer("CODIGO_FUNCIONAL", "PERF-01"),
  responsable: leer("RESPONSABLE", "elyer.maldonado"),
  tipoDePrueba: leer("TIPO_PRUEBA", "carga"),
};
