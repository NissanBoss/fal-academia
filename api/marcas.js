
export const LECCIONES_POR_MODULO = [5, 5, 5, 4, 4, 3, 6];
export const TOTAL_LECCIONES = LECCIONES_POR_MODULO.reduce((a, b) => a + b, 0);

export const FUNDADORES = 100;

export const PARA_ESCRIBIR = LECCIONES_POR_MODULO[0];

export const MARCAS = {
  fundador: {
    nombre: "Fundador",
    resumen: "De las cien primeras personas que se hicieron una cuenta.",
  },
  primer_modulo: {
    nombre: "Primeros pasos",
    resumen: "Terminó el primer módulo del curso.",
  },
  modulos_3: {
    nombre: "A medio camino",
    resumen: "Terminó tres módulos del curso.",
  },
  curso: {
    nombre: "El curso entero",
    resumen: "Las treinta y dos lecciones, una por una.",
  },
  sin_mirar: {
    nombre: "Por tu cuenta",
    resumen: "Resolvió diez ejercicios sin mirar la solución.",
  },
  primera_palabra: {
    nombre: "Primera palabra",
    resumen: "Escribió su primer mensaje en el foro.",
  },
  echo_una_mano: {
    nombre: "Echó una mano",
    resumen: "Alguien dijo que su respuesta le había ayudado.",
  },
};

function moduloDe(leccion) {
  let vistas = 0;
  for (let m = 0; m < LECCIONES_POR_MODULO.length; m++) {
    vistas += LECCIONES_POR_MODULO[m];
    if (leccion < vistas) return m;
  }
  return -1;
}

export function modulosCompletos(hechas) {
  const porModulo = new Array(LECCIONES_POR_MODULO.length).fill(0);
  for (const n of new Set(hechas)) {
    const m = moduloDe(n);
    if (m >= 0) porModulo[m]++;
  }
  return porModulo.filter((cuantas, m) => cuantas >= LECCIONES_POR_MODULO[m]).length;
}

export function marcasDelCurso(id, progreso) {
  const ganadas = [];
  if (id > 0 && id <= FUNDADORES) ganadas.push("fundador");

  const hechas = Array.isArray(progreso?.hechas) ? progreso.hechas : [];
  const completos = modulosCompletos(hechas);
  if (completos >= 1) ganadas.push("primer_modulo");
  if (completos >= 3) ganadas.push("modulos_3");
  if (new Set(hechas).size >= TOTAL_LECCIONES) ganadas.push("curso");

  const mirados = Array.isArray(progreso?.mirados) ? progreso.mirados : null;
  if (mirados) {
    const solas = hechas.filter((n) => !mirados.includes(n));
    if (solas.length >= 10) ganadas.push("sin_mirar");
  }
  return ganadas;
}

export async function apuntarMarcas(entorno, alumno, claves) {
  if (!claves.length) return [];
  const ahora = Date.now();
  await entorno.DB.batch(
    claves.map((c) =>
      entorno.DB.prepare(
        "INSERT OR IGNORE INTO marcas (alumno, clave, ganada) VALUES (?, ?, ?)"
      ).bind(alumno, c, ahora)
    )
  );
  return claves;
}

export async function marcasDe(entorno, alumno) {
  const filas = await entorno.DB.prepare(
    "SELECT clave, ganada FROM marcas WHERE alumno = ? ORDER BY ganada"
  ).bind(alumno).all();
  return (filas.results || [])
    .filter((f) => MARCAS[f.clave])
    .map((f) => ({
      clave: f.clave,
      nombre: MARCAS[f.clave].nombre,
      resumen: MARCAS[f.clave].resumen,
      ganada: f.ganada,
    }));
}

export function puedeEscribir(progreso) {
  const hechas = Array.isArray(progreso?.hechas) ? progreso.hechas : [];
  return modulosCompletos(hechas) >= 1;
}
