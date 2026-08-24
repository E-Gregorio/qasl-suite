export const perfiles = {
  smoke: {
    descripcion: "Verificacion minima: 2 usuarios durante 30 segundos",
    etapas: [{ duration: "30s", target: 2 }],
  },
  carga: {
    descripcion: "Carga esperada: rampa a 25 usuarios, meseta de 60 s y descenso",
    etapas: [
      { duration: "30s", target: 25 },
      { duration: "60s", target: 25 },
      { duration: "20s", target: 0 },
    ],
  },
  estres: {
    descripcion: "Por encima de lo esperado: rampa escalonada hasta 70 usuarios",
    etapas: [
      { duration: "20s", target: 20 },
      { duration: "20s", target: 40 },
      { duration: "20s", target: 60 },
      { duration: "30s", target: 70 },
      { duration: "20s", target: 0 },
    ],
  },
  pico: {
    descripcion: "Pico subito: 5 usuarios, salto a 60 durante 20 s y regreso",
    etapas: [
      { duration: "20s", target: 5 },
      { duration: "5s", target: 60 },
      { duration: "20s", target: 60 },
      { duration: "5s", target: 5 },
      { duration: "30s", target: 5 },
    ],
  },
  resistencia: {
    descripcion: "Carga constante y prolongada para detectar degradacion sostenida",
    etapas: [
      { duration: "1m", target: 15 },
      { duration: "20m", target: 15 },
      { duration: "1m", target: 0 },
    ],
  },
};

export const perfilDe = (tipo) => {
  const perfil = perfiles[tipo];
  if (!perfil) {
    throw new Error(`Tipo de prueba desconocido: ${tipo}. Opciones: ${Object.keys(perfiles).join(", ")}`);
  }
  return perfil;
};
