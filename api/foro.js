// El foro.
//
// Leerlo no pide cuenta. Escribir sí, y además haber terminado el primer
// módulo del curso, que es el filtro contra el spam: a una persona no le
// cuesta nada porque iba a hacerlo igual, y a un programa le cuesta aprender
// a programar en español.
//
// No hay votos ni puntuaciones. Solo un «esto me ayudó» en las respuestas,
// que sirve para encontrar la buena dentro de un hilo largo y para ganar una
// marca. Un foro pequeño con votos negativos se vuelve desagradable antes de
// tener gente suficiente para que sirvan de algo.

import {
  marcasDelCurso, apuntarMarcas, marcasDe, puedeEscribir, PARA_ESCRIBIR,
  FUNDADORES,
} from "./marcas.js";

const MAX_TITULO = 120;
const MAX_CUERPO = 8000;
const TEMAS_POR_PAGINA = 25;
const SEGUNDOS_ENTRE_MENSAJES = 20;

export async function repartirForo(ruta, peticion, entorno, quienEs) {
  const metodo = peticion.method;
  const url = new URL(peticion.url);

  if (ruta === "/api/foro/categorias" && metodo === "GET") return categorias(entorno);
  if (ruta === "/api/foro/temas" && metodo === "GET") return listarTemas(url, entorno);
  if (ruta === "/api/foro/temas" && metodo === "POST") return abrirTema(peticion, entorno, quienEs);
  if (ruta.startsWith("/api/foro/tema/") && metodo === "GET") return verTema(ruta, entorno);
  if (ruta === "/api/foro/mensajes" && metodo === "POST") return responder(peticion, entorno, quienEs);
  if (ruta === "/api/foro/ayuda" && metodo === "POST") return marcarAyuda(peticion, entorno, quienEs);
  if (ruta === "/api/foro/ocultar" && metodo === "POST") return ocultar(peticion, entorno, quienEs);
  if (ruta.startsWith("/api/foro/perfil/") && metodo === "GET") return perfil(ruta, entorno);
  if (ruta === "/api/foro/puedo" && metodo === "GET") return puedoEscribir(entorno, quienEs);
  return null;
}

function json(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function categorias(entorno) {
  const filas = await entorno.DB.prepare(
    "SELECT clave, nombre, resumen FROM categorias ORDER BY orden"
  ).all();
  return json({ categorias: filas.results || [], fundadores: FUNDADORES });
}

// La lista de temas. Trae ya el nombre de quien lo abrió para no tener que
// pedir un perfil por fila, que con el tope diario de lecturas del plan
// gratuito es la diferencia entre una consulta y veinticinco.
async function listarTemas(url, entorno) {
  const categoria = url.searchParams.get("categoria") || "";
  const pagina = Math.max(0, parseInt(url.searchParams.get("pagina") || "0", 10) || 0);

  let sql =
    "SELECT t.id, t.titulo, t.creado, t.movido, t.mensajes, t.cerrado, " +
    "       a.usuario AS autor, a.id AS autorId, c.clave AS categoria, c.nombre AS categoriaNombre " +
    "FROM temas t " +
    "JOIN alumnos a ON a.id = t.autor " +
    "JOIN categorias c ON c.id = t.categoria " +
    "WHERE t.oculto = 0";
  const atar = [];
  if (categoria) {
    sql += " AND c.clave = ?";
    atar.push(categoria);
  }
  sql += " ORDER BY t.movido DESC LIMIT ? OFFSET ?";
  atar.push(TEMAS_POR_PAGINA + 1, pagina * TEMAS_POR_PAGINA);

  const filas = await entorno.DB.prepare(sql).bind(...atar).all();
  const temas = filas.results || [];
  const hayMas = temas.length > TEMAS_POR_PAGINA;
  return json({ temas: temas.slice(0, TEMAS_POR_PAGINA), hayMas, pagina });
}

async function verTema(ruta, entorno) {
  const id = parseInt(ruta.slice("/api/foro/tema/".length), 10);
  if (!Number.isInteger(id) || id < 1) return json({ error: "ese tema no existe" }, 404);

  const tema = await entorno.DB.prepare(
    "SELECT t.id, t.titulo, t.creado, t.cerrado, a.usuario AS autor, a.id AS autorId, " +
    "       c.clave AS categoria, c.nombre AS categoriaNombre " +
    "FROM temas t JOIN alumnos a ON a.id = t.autor JOIN categorias c ON c.id = t.categoria " +
    "WHERE t.id = ? AND t.oculto = 0"
  ).bind(id).first();
  if (!tema) return json({ error: "ese tema no existe" }, 404);

  const filas = await entorno.DB.prepare(
    "SELECT m.id, m.cuerpo, m.creado, m.editado, m.ayudas, m.oculto, " +
    "       a.usuario AS autor, a.id AS autorId " +
    "FROM mensajes m JOIN alumnos a ON a.id = m.autor " +
    "WHERE m.tema = ? ORDER BY m.creado LIMIT 400"
  ).bind(id).all();

  // Un mensaje borrado deja su hueco, para que no queden respuestas
  // colgando de algo que ya no está.
  const mensajes = (filas.results || []).map((m) =>
    m.oculto
      ? { id: m.id, borrado: true, creado: m.creado }
      : { id: m.id, cuerpo: m.cuerpo, creado: m.creado, editado: m.editado,
          ayudas: m.ayudas, autor: m.autor, autorId: m.autorId }
  );
  return json({ tema, mensajes });
}

async function quienPuede(entorno, quienEs) {
  if (!quienEs) return { puede: false, motivo: "entra en tu cuenta para escribir" };
  const fila = await entorno.DB.prepare("SELECT datos FROM progreso WHERE alumno = ?")
    .bind(quienEs.id).first();
  let progreso = null;
  try { progreso = fila ? JSON.parse(fila.datos) : null; } catch (e) {}
  if (!puedeEscribir(progreso)) {
    return {
      puede: false,
      motivo: "termina el primer módulo del curso para poder escribir",
      faltan: Math.max(0, PARA_ESCRIBIR - (progreso?.hechas?.length || 0)),
    };
  }
  return { puede: true, progreso };
}

async function puedoEscribir(entorno, quienEs) {
  const r = await quienPuede(entorno, quienEs);
  return json({ puede: r.puede, motivo: r.motivo || "", faltan: r.faltan || 0 });
}

// Un tope de tiempo entre mensajes. No es contra las personas: es contra la
// cuenta que consigue pasar el filtro del curso y luego suelta cincuenta
// mensajes seguidos.
async function vaDemasiadoRapido(entorno, alumno) {
  const ultimo = await entorno.DB.prepare(
    "SELECT creado FROM mensajes WHERE autor = ? ORDER BY creado DESC LIMIT 1"
  ).bind(alumno).first();
  if (!ultimo) return false;
  return Date.now() - ultimo.creado < SEGUNDOS_ENTRE_MENSAJES * 1000;
}

export function limpiar(texto, tope) {
  if (typeof texto !== "string") return "";
  // Se recorre letra a letra y se comparan numeros, sin escribir ningun
  // caracter raro dentro de este archivo. Meter los propios caracteres de
  // control en una expresion regular deja el fuente lleno de bytes que
  // ninguna herramienta sabe enseñar, y git pasa a tratarlo como binario.
  //
  // Fuera se quedan los de control, menos el salto de linea y el tabulador,
  // que si hacen falta para pegar un trozo de programa. Y fuera las marcas
  // de direccion del texto, que sirven para escribir algo al reves y
  // hacerse pasar por otro.
  let salida = "";
  for (const letra of texto) {
    const n = letra.codePointAt(0);
    const esControl = (n < 0x20 && letra !== "\n" && letra !== "\t") || n === 0x7f;
    const esInvisible =
      (n >= 0x200b && n <= 0x200f) ||
      (n >= 0x202a && n <= 0x202e) ||
      (n >= 0x2066 && n <= 0x2069) ||
      n === 0xfeff;
    if (!esControl && !esInvisible) salida += letra;
  }
  return salida.trim().slice(0, tope);
}

async function abrirTema(peticion, entorno, quienEs) {
  const permiso = await quienPuede(entorno, quienEs);
  if (!permiso.puede) return json({ error: permiso.motivo, faltan: permiso.faltan }, 403);

  const cuerpo = await peticion.json().catch(() => null);
  if (!cuerpo) return json({ error: "no entiendo lo que me mandas" }, 400);

  const titulo = limpiar(cuerpo.titulo, MAX_TITULO);
  const texto = limpiar(cuerpo.cuerpo, MAX_CUERPO);
  if (titulo.length < 5) return json({ error: "El título es demasiado corto. Di en una línea de qué va." }, 400);
  if (texto.length < 10) return json({ error: "Cuenta un poco más, que así no hay quien ayude." }, 400);

  const categoria = await entorno.DB.prepare("SELECT id FROM categorias WHERE clave = ?")
    .bind(String(cuerpo.categoria || "")).first();
  if (!categoria) return json({ error: "Esa categoría no existe." }, 400);

  if (await vaDemasiadoRapido(entorno, quienEs.id)) {
    return json({ error: "Espera un momento antes de escribir otra vez." }, 429);
  }

  const ahora = Date.now();
  const puesto = await entorno.DB.prepare(
    "INSERT INTO temas (categoria, autor, titulo, creado, movido, mensajes) VALUES (?, ?, ?, ?, ?, 1)"
  ).bind(categoria.id, quienEs.id, titulo, ahora, ahora).run();
  const tema = puesto.meta.last_row_id;

  await entorno.DB.prepare(
    "INSERT INTO mensajes (tema, autor, cuerpo, creado) VALUES (?, ?, ?, ?)"
  ).bind(tema, quienEs.id, texto, ahora).run();

  await trasEscribir(entorno, quienEs.id, permiso.progreso);
  return json({ tema });
}

async function responder(peticion, entorno, quienEs) {
  const permiso = await quienPuede(entorno, quienEs);
  if (!permiso.puede) return json({ error: permiso.motivo, faltan: permiso.faltan }, 403);

  const cuerpo = await peticion.json().catch(() => null);
  const tema = parseInt(cuerpo?.tema, 10);
  const texto = limpiar(cuerpo?.cuerpo, MAX_CUERPO);
  if (!Number.isInteger(tema) || texto.length < 2) {
    return json({ error: "Falta el mensaje." }, 400);
  }

  const existe = await entorno.DB.prepare(
    "SELECT id, cerrado FROM temas WHERE id = ? AND oculto = 0"
  ).bind(tema).first();
  if (!existe) return json({ error: "ese tema no existe" }, 404);
  if (existe.cerrado) return json({ error: "Este tema está cerrado." }, 403);

  if (await vaDemasiadoRapido(entorno, quienEs.id)) {
    return json({ error: "Espera un momento antes de escribir otra vez." }, 429);
  }

  const ahora = Date.now();
  const puesto = await entorno.DB.prepare(
    "INSERT INTO mensajes (tema, autor, cuerpo, creado) VALUES (?, ?, ?, ?)"
  ).bind(tema, quienEs.id, texto, ahora).run();

  await entorno.DB.prepare(
    "UPDATE temas SET movido = ?, mensajes = mensajes + 1 WHERE id = ?"
  ).bind(ahora, tema).run();

  await trasEscribir(entorno, quienEs.id, permiso.progreso);
  return json({ mensaje: puesto.meta.last_row_id });
}

// Las marcas se repasan al escribir, que es cuando alguien va a mirar su
// propio perfil, y de paso se le da la de haber hablado por primera vez.
async function trasEscribir(entorno, alumno, progreso) {
  const claves = marcasDelCurso(alumno, progreso);
  claves.push("primera_palabra");
  await apuntarMarcas(entorno, alumno, claves);
}

async function marcarAyuda(peticion, entorno, quienEs) {
  if (!quienEs) return json({ error: "entra en tu cuenta" }, 401);
  const cuerpo = await peticion.json().catch(() => null);
  const mensaje = parseInt(cuerpo?.mensaje, 10);
  if (!Number.isInteger(mensaje)) return json({ error: "Falta el mensaje." }, 400);

  const fila = await entorno.DB.prepare(
    "SELECT id, autor FROM mensajes WHERE id = ? AND oculto = 0"
  ).bind(mensaje).first();
  if (!fila) return json({ error: "ese mensaje no existe" }, 404);
  // Marcarse a uno mismo no dice nada de nadie.
  if (fila.autor === quienEs.id) return json({ error: "eso es tuyo" }, 400);

  const ya = await entorno.DB.prepare(
    "INSERT OR IGNORE INTO ayudas (mensaje, alumno, cuando) VALUES (?, ?, ?)"
  ).bind(mensaje, quienEs.id, Date.now()).run();

  if (ya.meta.changes > 0) {
    await entorno.DB.prepare("UPDATE mensajes SET ayudas = ayudas + 1 WHERE id = ?")
      .bind(mensaje).run();
    await apuntarMarcas(entorno, fila.autor, ["echo_una_mano"]);
  }
  const cuenta = await entorno.DB.prepare("SELECT ayudas FROM mensajes WHERE id = ?")
    .bind(mensaje).first();
  return json({ ayudas: cuenta?.ayudas || 0 });
}

async function esModerador(entorno, quienEs) {
  if (!quienEs) return false;
  const fila = await entorno.DB.prepare("SELECT alumno FROM moderadores WHERE alumno = ?")
    .bind(quienEs.id).first();
  return !!fila;
}

// Borrar. El autor puede quitar lo suyo y quien modera puede quitar
// cualquier cosa. Nada se borra de verdad: se marca, para que el hilo siga
// teniendo sentido y para poder deshacerlo si alguien se equivoca.
async function ocultar(peticion, entorno, quienEs) {
  if (!quienEs) return json({ error: "entra en tu cuenta" }, 401);
  const cuerpo = await peticion.json().catch(() => null);
  const modera = await esModerador(entorno, quienEs);

  if (cuerpo?.mensaje) {
    const id = parseInt(cuerpo.mensaje, 10);
    const fila = await entorno.DB.prepare("SELECT autor, tema FROM mensajes WHERE id = ?")
      .bind(id).first();
    if (!fila) return json({ error: "ese mensaje no existe" }, 404);
    if (fila.autor !== quienEs.id && !modera) return json({ error: "eso no es tuyo" }, 403);
    await entorno.DB.prepare("UPDATE mensajes SET oculto = 1 WHERE id = ?").bind(id).run();
    return json({ hecho: true });
  }

  if (cuerpo?.tema) {
    const id = parseInt(cuerpo.tema, 10);
    const fila = await entorno.DB.prepare("SELECT autor FROM temas WHERE id = ?")
      .bind(id).first();
    if (!fila) return json({ error: "ese tema no existe" }, 404);
    if (fila.autor !== quienEs.id && !modera) return json({ error: "eso no es tuyo" }, 403);
    await entorno.DB.prepare("UPDATE temas SET oculto = 1 WHERE id = ?").bind(id).run();
    return json({ hecho: true });
  }
  return json({ error: "no dices qué borrar" }, 400);
}

// Una línea suelta de un mensaje, para el índice del perfil. Se quitan las
// comillas que abren un bloque de código y se juntan los saltos de línea:
// en una sola línea no significan nada y el resumen acaba siendo un montón
// de símbolos sueltos en vez de una frase que se pueda leer.
export function resumir(cuerpo) {
  const plano = cuerpo.split("```").join(" ").replace(/\s+/g, " ").trim();
  return plano.length > 180 ? plano.slice(0, 180) + "…" : plano;
}

// El perfil de alguien: sus marcas y por dónde ha andado.
//
// No enseña el progreso del curso lección a lección. Las marcas dicen lo que
// ha conseguido, que es lo que la persona quiere enseñar; el detalle de en
// qué ejercicio se atascó es asunto suyo.
async function perfil(ruta, entorno) {
  const nombre = decodeURIComponent(ruta.slice("/api/foro/perfil/".length));
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(nombre)) return json({ error: "no hay nadie así" }, 404);

  const quien = await entorno.DB.prepare(
    "SELECT id, usuario, creado FROM alumnos WHERE llave = ?"
  ).bind(nombre.toLowerCase()).first();
  if (!quien) return json({ error: "no hay nadie así" }, 404);

  const temas = await entorno.DB.prepare(
    "SELECT t.id, t.titulo, t.creado, t.mensajes, c.nombre AS categoriaNombre " +
    "FROM temas t JOIN categorias c ON c.id = t.categoria " +
    "WHERE t.autor = ? AND t.oculto = 0 ORDER BY t.creado DESC LIMIT 30"
  ).bind(quien.id).all();

  // Respuestas de verdad, no el mensaje con el que se abre un tema. Ese ya
  // sale más arriba bajo «ha abierto», y contarlo dos veces hace que un
  // perfil parezca el doble de activo de lo que es.
  const respuestas = await entorno.DB.prepare(
    "SELECT m.id, m.cuerpo, m.creado, m.ayudas, t.id AS tema, t.titulo " +
    "FROM mensajes m JOIN temas t ON t.id = m.tema " +
    "WHERE m.autor = ? AND m.oculto = 0 AND t.oculto = 0 " +
    "AND m.id <> (SELECT MIN(id) FROM mensajes WHERE tema = t.id) " +
    "ORDER BY m.creado DESC LIMIT 30"
  ).bind(quien.id).all();

  const cuentas = await entorno.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM temas WHERE autor = ? AND oculto = 0) AS temas, " +
    "       (SELECT COUNT(*) FROM mensajes WHERE autor = ? AND oculto = 0) AS mensajes, " +
    "       (SELECT COALESCE(SUM(ayudas), 0) FROM mensajes WHERE autor = ? AND oculto = 0) AS ayudas"
  ).bind(quien.id, quien.id, quien.id).first();

  return json({
    usuario: quien.usuario,
    desde: quien.creado,
    fundador: quien.id <= 100,
    marcas: await marcasDe(entorno, quien.id),
    temas: temas.results || [],
    // Las respuestas se recortan: el perfil es un índice, no una relectura.
    respuestas: (respuestas.results || []).map((r) => ({ ...r, cuerpo: resumir(r.cuerpo) })),
    cuentas: cuentas || { temas: 0, mensajes: 0, ayudas: 0 },
  });
}
