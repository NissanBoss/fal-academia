// Las marcas que se ganan, y quién puede escribir en el foro.
//
// Todas se deciden aquí, en el servidor, a partir de lo que ya hay guardado.
// Ninguna se puede pedir desde el navegador ni fingir: la de haber terminado
// el curso mira el progreso de verdad, y la de fundador mira el número de
// cuenta, que lo puso la base de datos al registrarse y nadie lo elige.
//
// Se guardan al ganarlas en lugar de calcularlas cada vez que alguien abre
// un perfil. Una marca es un momento, la fecha en que se consiguió es la
// mitad de la gracia, y además pintar un perfil no tiene por qué leerse el
// progreso entero de nadie.

// Cuántas lecciones tiene cada módulo del curso, en orden. Si el curso
// crece, esto crece con él: es lo único que hay que tocar aquí.
export const LECCIONES_POR_MODULO = [5, 5, 5, 4, 4, 3, 6];
export const TOTAL_LECCIONES = LECCIONES_POR_MODULO.reduce((a, b) => a + b, 0);

// Hasta qué número de cuenta se considera fundador. Es lo que marca la
// diferencia entre haber estado al principio y haber llegado después.
export const FUNDADORES = 100;

// Cuántas lecciones hay que llevar para poder escribir en el foro. Es el
// primer módulo entero.
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

// A qué módulo pertenece una lección, por su número empezando en cero.
function moduloDe(leccion) {
  let vistas = 0;
  for (let m = 0; m < LECCIONES_POR_MODULO.length; m++) {
    vistas += LECCIONES_POR_MODULO[m];
    if (leccion < vistas) return m;
  }
  return -1;
}

// Cuántos módulos están enteros.
export function modulosCompletos(hechas) {
  const porModulo = new Array(LECCIONES_POR_MODULO.length).fill(0);
  for (const n of hechas) {
    const m = moduloDe(n);
    if (m >= 0) porModulo[m]++;
  }
  return porModulo.filter((cuantas, m) => cuantas >= LECCIONES_POR_MODULO[m]).length;
}

// Qué marcas le corresponden a alguien por su curso. Devuelve las claves,
// sin mirar cuáles tenía ya: de eso se encarga quien las guarda.
export function marcasDelCurso(id, progreso) {
  const ganadas = [];
  if (id > 0 && id <= FUNDADORES) ganadas.push("fundador");

  const hechas = Array.isArray(progreso?.hechas) ? progreso.hechas : [];
  const completos = modulosCompletos(hechas);
  if (completos >= 1) ganadas.push("primer_modulo");
  if (completos >= 3) ganadas.push("modulos_3");
  if (hechas.length >= TOTAL_LECCIONES) ganadas.push("curso");

  // Las lecciones resueltas sin pulsar «ver la solución». La academia
  // apunta cuáles fueron, y si esa lista no está, la marca simplemente no
  // se gana: nunca se da por supuesto que no miró.
  const mirados = Array.isArray(progreso?.mirados) ? progreso.mirados : null;
  if (mirados) {
    const solas = hechas.filter((n) => !mirados.includes(n));
    if (solas.length >= 10) ganadas.push("sin_mirar");
  }
  return ganadas;
}

// Guarda las que falten. INSERT OR IGNORE deja intacta la fecha de las que
// ya estaban, que es lo que hace que una marca conserve el día en que se
// ganó aunque se recalcule mil veces.
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

// Si alguien puede abrir temas y responder.
//
// Hace falta el primer módulo del curso. Eso es el filtro contra el spam, y
// es mejor que un captcha por dos motivos: a una persona no le cuesta nada
// porque iba a hacerlo de todas formas, y a un programa le cuesta aprender a
// programar en español, que es bastante más de lo que cuesta pagar a alguien
// para que resuelva captchas.
export function puedeEscribir(progreso) {
  const hechas = Array.isArray(progreso?.hechas) ? progreso.hechas : [];
  return modulosCompletos(hechas) >= 1;
}
