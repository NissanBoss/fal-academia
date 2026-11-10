
import {
  VUELTAS_CLIENTE, nombreValido, estiradoValido, guardarSecreto,
  coincide, igualSinChivarse, resumen, alAzar, codigoDeRescate, SENUELO,
} from "./contrasenas.js";
import { repartirForo } from "./foro.js";
import {
  CEROS_REGISTRO, CEROS_ENTRAR, ventanaAhora,
  semillaDeRegistro, semillaDeEntrada, semillaDeRescate, trabajoHecho,
} from "./trabajo.js";
import { marcasDelCurso, apuntarMarcas } from "./marcas.js";

const MAX_PROGRESO = 64 * 1024;
const DIAS_DE_SESION = 180;
const FALLOS_PERMITIDOS = 8;
const MINUTOS_CASTIGO = 15;

const REGISTROS_POR_HORA = 20;

const CUPO_REGISTROS = "registros globales";


export async function manejar(peticion, entorno) {
  const origen = permitido(peticion, entorno);
  if (peticion.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...SEGURIDAD, ...cabeceras(origen) } });
  }

  if (peticion.method !== "GET" && !esOrigenBueno(peticion, entorno)) {
    return responder({ error: "esa página no puede pedir esto" }, 403, origen);
  }

  const ruta = new URL(peticion.url).pathname.replace(/\/+$/, "");
  try {
    const respuesta = await repartir(ruta, peticion, entorno);
    for (const [k, v] of Object.entries({ ...SEGURIDAD, ...cabeceras(origen) })) {
      respuesta.headers.set(k, v);
    }
    return respuesta;
  } catch (fallo) {
    console.error(fallo && fallo.stack ? fallo.stack : fallo);
    return responder({ error: "algo se ha roto aqui dentro" }, 500, origen);
  }
}

async function repartir(ruta, peticion, entorno) {
  const metodo = peticion.method;

  if (ruta.startsWith("/api/foro/")) {
    const quienEs = await deLaSesion(peticion, entorno);
    const respuesta = await repartirForo(ruta, peticion, entorno, quienEs);
    if (respuesta) return respuesta;
  }

  if (ruta === "/api/reto" && metodo === "GET") return darReto(peticion);
  if (ruta === "/api/registro" && metodo === "POST") return registrar(peticion, entorno);
  if (ruta === "/api/entrar" && metodo === "POST") return entrar(peticion, entorno);
  if (ruta === "/api/salir" && metodo === "POST") return salir(peticion, entorno);
  if (ruta === "/api/yo" && metodo === "GET") return quienSoy(peticion, entorno);
  if (ruta === "/api/progreso" && metodo === "GET") return leerProgreso(peticion, entorno);
  if (ruta === "/api/progreso" && metodo === "PUT") return escribirProgreso(peticion, entorno);
  if (ruta === "/api/rescate" && metodo === "POST") return rescatar(peticion, entorno);
  if (ruta === "/api/borrarme" && metodo === "POST") return borrarme(peticion, entorno);
  if (ruta === "/api/salud" && metodo === "GET") return new Response("bien", { status: 200 });
  return new Response(JSON.stringify({ error: "no hay nada aqui" }), {
    status: 404,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function listaDeOrigenes(entorno) {
  return (entorno.ORIGENES || "").split(",").map((o) => o.trim()).filter(Boolean);
}

function permitido(peticion, entorno) {
  const origen = peticion.headers.get("Origin") || "";
  const buenos = listaDeOrigenes(entorno);
  return buenos.includes(origen) ? origen : buenos[0] || "";
}

function esOrigenBueno(peticion, entorno) {
  const origen = peticion.headers.get("Origin");
  if (!origen) return false;
  return listaDeOrigenes(entorno).includes(origen);
}

function cabeceras(origen) {
  return {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

const SEGURIDAD = {
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Cache-Control": "no-store",
};

function responder(cuerpo, estado, origen, extra) {
  const h = {
    "content-type": "application/json; charset=utf-8",
    ...SEGURIDAD,
    ...cabeceras(origen || ""),
  };
  if (extra) Object.assign(h, extra);
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: h });
}



function darReto(peticion) {
  const usuario = new URL(peticion.url).searchParams.get("usuario") || "";
  if (!nombreValido(usuario)) {
    return responder({ error: "Ese nombre no vale." }, 400);
  }
  return responder({
    semilla: semillaDeRegistro(usuario, ventanaAhora()),
    ceros: CEROS_REGISTRO,
  }, 200);
}

async function registrar(peticion, entorno) {
  const cuerpo = await leerJSON(peticion);
  if (!cuerpo) return responder({ error: "no entiendo lo que me mandas" }, 400);
  const { usuario, estirado } = cuerpo;

  if (!nombreValido(usuario)) {
    return responder({
      error: "El nombre tiene que tener entre 3 y 24 letras o numeros, y puede llevar guiones.",
    }, 400);
  }
  if (!estiradoValido(estirado)) {
    return responder({ error: "La contraseña no llego bien. Recarga la pagina." }, 400);
  }

  const llave = usuario.toLowerCase();
  const ya = await entorno.DB.prepare("SELECT id FROM alumnos WHERE llave = ?").bind(llave).first();
  if (ya) return responder({ error: "Ese nombre ya lo tiene alguien. Prueba con otro." }, 409);

  if (!(await trabajoHecho((v) => semillaDeRegistro(usuario, v), cuerpo.nonce, CEROS_REGISTRO))) {
    return responder({
      error: "Falta la comprobacion. Recarga la pagina y vuelve a intentarlo.",
    }, 400);
  }

  if (!(await hayCupoParaRegistrar(entorno))) {
    return responder({
      error: "Se estan creando muchas cuentas ahora mismo. Vuelve dentro de un rato.",
    }, 429);
  }

  const rescate = codigoDeRescate();
  const ahora = Date.now();
  const guardado = await entorno.DB.prepare(
    "INSERT INTO alumnos (usuario, llave, clave, rescate, creado) VALUES (?, ?, ?, ?, ?)"
  ).bind(usuario, llave, await guardarSecreto(estirado), await guardarSecreto(rescate), ahora).run();

  const id = guardado.meta.last_row_id;
  await entorno.DB.prepare("INSERT INTO progreso (alumno, datos, guardado) VALUES (?, ?, ?)")
    .bind(id, JSON.stringify({ hechas: [], actual: 0, borradores: {} }), ahora).run();

  const galleta = await abrirSesion(entorno, id);
  return responder({ usuario, rescate }, 200, null, { "Set-Cookie": galleta });
}

async function entrar(peticion, entorno) {
  const cuerpo = await leerJSON(peticion);
  if (!cuerpo) return responder({ error: "no entiendo lo que me mandas" }, 400);
  const { usuario, estirado } = cuerpo;
  if (!nombreValido(usuario) || !estiradoValido(estirado)) {
    return responder({ error: "El nombre o la contraseña no valen." }, 400);
  }

  const llave = usuario.toLowerCase();
  if (await castigado(entorno, llave)) {
    return responder({
      error: "Demasiados intentos. Espera un cuarto de hora y vuelve.",
    }, 429);
  }

  const fallos = await cuantosFallos(entorno, llave);
  if (fallos > 0) {
    const hecho = await trabajoHecho(
      (v) => semillaDeEntrada(usuario, v, fallos), cuerpo.nonce, CEROS_ENTRAR
    );
    if (!hecho) {
      return responder({
        error: "Ese nombre o esa contraseña no son.",
        reto: { semilla: semillaDeEntrada(usuario, ventanaAhora(), fallos), ceros: CEROS_ENTRAR },
      }, 401);
    }
  }

  const fila = await entorno.DB.prepare("SELECT id, usuario, clave FROM alumnos WHERE llave = ?")
    .bind(llave).first();

  const contra = fila ? fila.clave : SENUELO;
  const vale = await coincide(estirado, contra);

  if (!fila || !vale) {
    if (fila) await apuntarFallo(entorno, llave);
    return responder({ error: "Ese nombre o esa contraseña no son." }, 401);
  }
  await limpiarFallos(entorno, llave);
  const galleta = await abrirSesion(entorno, fila.id);
  return responder({ usuario: fila.usuario }, 200, null, { "Set-Cookie": galleta });
}

async function salir(peticion, entorno) {
  const testigo = galletaDe(peticion);
  if (testigo) {
    await entorno.DB.prepare("DELETE FROM sesiones WHERE testigo = ?")
      .bind(await resumen(testigo)).run();
  }
  return responder({ hecho: true }, 200, null, {
    "Set-Cookie": `${GALLETA}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  });
}

async function quienSoy(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ dentro: false }, 200);
  return responder({ dentro: true, usuario: alumno.usuario }, 200);
}

async function rescatar(peticion, entorno) {
  const cuerpo = await leerJSON(peticion);
  if (!cuerpo) return responder({ error: "no entiendo lo que me mandas" }, 400);
  const { usuario, rescate, estirado } = cuerpo;
  if (!nombreValido(usuario) || !estiradoValido(estirado) ||
      typeof rescate !== "string" || rescate.length > 64) {
    return responder({ error: "Faltan datos." }, 400);
  }
  const llave = usuario.toLowerCase();
  if (await castigado(entorno, "r:" + llave)) {
    return responder({ error: "Demasiados intentos. Espera un cuarto de hora." }, 429);
  }
  const fallos = await cuantosFallos(entorno, "r:" + llave);
  if (!(await trabajoHecho((v) => semillaDeRescate(usuario, v, fallos), cuerpo.nonce, CEROS_ENTRAR))) {
    return responder({
      error: "Falta la comprobacion.",
      reto: { semilla: semillaDeRescate(usuario, ventanaAhora(), fallos), ceros: CEROS_ENTRAR },
    }, 401);
  }
  const fila = await entorno.DB.prepare("SELECT id, rescate FROM alumnos WHERE llave = ?")
    .bind(llave).first();
  if (!fila || !(await coincide(rescate.trim().toUpperCase(), fila.rescate))) {
    if (fila) await apuntarFallo(entorno, "r:" + llave);
    return responder({ error: "Ese codigo de rescate no es." }, 401);
  }

  const nuevo = codigoDeRescate();
  await entorno.DB.prepare("UPDATE alumnos SET clave = ?, rescate = ? WHERE id = ?")
    .bind(await guardarSecreto(estirado), await guardarSecreto(nuevo), fila.id).run();
  await entorno.DB.prepare("DELETE FROM sesiones WHERE alumno = ?").bind(fila.id).run();
  await limpiarFallos(entorno, "r:" + llave);

  const galleta = await abrirSesion(entorno, fila.id);
  return responder({ usuario, rescate: nuevo }, 200, null, { "Set-Cookie": galleta });
}

async function borrarme(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ error: "no has entrado" }, 401);
  const llave = alumno.usuario.toLowerCase();

  await entorno.DB.batch([
    entorno.DB.prepare(
      "UPDATE mensajes SET ayudas = ayudas - 1 " +
      "WHERE id IN (SELECT mensaje FROM ayudas WHERE alumno = ?)"
    ).bind(alumno.id),
    entorno.DB.prepare("DELETE FROM ayudas WHERE alumno = ?").bind(alumno.id),

    entorno.DB.prepare(
      "UPDATE mensajes SET cuerpo = '', oculto = 1, autor = 0 WHERE autor = ?"
    ).bind(alumno.id),
    entorno.DB.prepare("UPDATE temas SET autor = 0 WHERE autor = ?").bind(alumno.id),

    entorno.DB.prepare("DELETE FROM marcas WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM moderadores WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM progreso WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM sesiones WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM fallos WHERE quien = ?").bind(llave),
    entorno.DB.prepare("DELETE FROM alumnos WHERE id = ?").bind(alumno.id),
  ]);
  return responder({ hecho: true }, 200, null, {
    "Set-Cookie": `${GALLETA}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  });
}


async function leerProgreso(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ error: "no has entrado" }, 401);
  const fila = await entorno.DB.prepare("SELECT datos FROM progreso WHERE alumno = ?")
    .bind(alumno.id).first();
  return responder({ progreso: fila ? JSON.parse(fila.datos) : null }, 200);
}

async function escribirProgreso(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ error: "no has entrado" }, 401);
  const cuerpo = await leerJSON(peticion);
  if (!cuerpo || typeof cuerpo.progreso !== "object" || cuerpo.progreso === null) {
    return responder({ error: "no entiendo lo que me mandas" }, 400);
  }

  const sinRepetir = (lista) => [...new Set(Array.isArray(lista) ? lista : [])]
    .filter((n) => Number.isInteger(n) && n >= 0 && n < 500).slice(0, 500);
  const limpio = {
    hechas: sinRepetir(cuerpo.progreso.hechas),
    actual: Number.isInteger(cuerpo.progreso.actual) ? Math.max(0, Math.min(499, cuerpo.progreso.actual)) : 0,
    mirados: sinRepetir(cuerpo.progreso.mirados),
    borradores: {},
  };
  const vienen = cuerpo.progreso.borradores;
  if (vienen && typeof vienen === "object") {
    for (const [clave, texto] of Object.entries(vienen)) {
      if (!/^\d{1,3}$/.test(clave) || typeof texto !== "string") continue;
      limpio.borradores[clave] = texto.slice(0, 4000);
    }
  }

  const datos = JSON.stringify(limpio);
  if (datos.length > MAX_PROGRESO) {
    return responder({ error: "eso es demasiado grande" }, 413);
  }
  await entorno.DB.prepare(
    "INSERT INTO progreso (alumno, datos, guardado) VALUES (?, ?, ?) " +
    "ON CONFLICT(alumno) DO UPDATE SET datos = excluded.datos, guardado = excluded.guardado"
  ).bind(alumno.id, datos, Date.now()).run();

  const ganadas = await apuntarMarcas(entorno, alumno.id, marcasDelCurso(alumno.id, limpio));
  return responder({ hecho: true, marcas: ganadas }, 200);
}


async function abrirSesion(entorno, alumno) {
  const testigo = alAzar(32);
  const ahora = Date.now();

  await limpiarCaducado(entorno, ahora);
  await entorno.DB.prepare(
    "INSERT INTO sesiones (testigo, alumno, creada) VALUES (?, ?, ?)"
  ).bind(await resumen(testigo), alumno, ahora).run();

  const segundos = DIAS_DE_SESION * 24 * 60 * 60;
  return `${GALLETA}=${testigo}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`;
}

const GALLETA = "__Host-sesion";

function galletaDe(peticion) {
  const crudo = peticion.headers.get("Cookie") || "";
  for (const trozo of crudo.split(";")) {
    const [nombre, ...resto] = trozo.trim().split("=");
    if (nombre === GALLETA) return resto.join("=");
  }
  return "";
}

async function deLaSesion(peticion, entorno) {
  const testigo = galletaDe(peticion);
  if (!testigo || testigo.length < 20) return null;
  const caduca = Date.now() - DIAS_DE_SESION * 24 * 60 * 60 * 1000;
  const fila = await entorno.DB.prepare(
    "SELECT a.id AS id, a.usuario AS usuario, s.creada AS creada " +
    "FROM sesiones s JOIN alumnos a ON a.id = s.alumno WHERE s.testigo = ?"
  ).bind(await resumen(testigo)).first();
  if (!fila || fila.creada < caduca) return null;
  return { id: fila.id, usuario: fila.usuario };
}

async function limpiarCaducado(entorno, ahora) {
  const caduca = ahora - DIAS_DE_SESION * 24 * 60 * 60 * 1000;
  await entorno.DB.batch([
    entorno.DB.prepare("DELETE FROM sesiones WHERE creada < ?").bind(caduca),
    entorno.DB.prepare("DELETE FROM fallos WHERE hasta <= ?").bind(ahora),
  ]);
}


async function hayCupoParaRegistrar(entorno) {
  const ahora = Date.now();
  const fila = await entorno.DB.prepare("SELECT cuantos, hasta FROM fallos WHERE quien = ?")
    .bind(CUPO_REGISTROS).first();

  if (!fila || fila.hasta <= ahora) {
    await entorno.DB.prepare(
      "INSERT INTO fallos (quien, cuantos, hasta) VALUES (?, 1, ?) " +
      "ON CONFLICT(quien) DO UPDATE SET cuantos = 1, hasta = excluded.hasta"
    ).bind(CUPO_REGISTROS, ahora + 60 * 60 * 1000).run();
    return true;
  }
  if (fila.cuantos >= REGISTROS_POR_HORA) return false;
  await entorno.DB.prepare("UPDATE fallos SET cuantos = cuantos + 1 WHERE quien = ?")
    .bind(CUPO_REGISTROS).run();
  return true;
}

async function cuantosFallos(entorno, quien) {
  const fila = await entorno.DB.prepare("SELECT cuantos, hasta FROM fallos WHERE quien = ?")
    .bind(quien).first();
  if (!fila || fila.hasta <= Date.now()) return 0;
  return fila.cuantos;
}

async function castigado(entorno, quien) {
  const fila = await entorno.DB.prepare("SELECT cuantos, hasta FROM fallos WHERE quien = ?")
    .bind(quien).first();
  return !!fila && fila.cuantos >= FALLOS_PERMITIDOS && fila.hasta > Date.now();
}

async function apuntarFallo(entorno, quien) {
  const hasta = Date.now() + MINUTOS_CASTIGO * 60 * 1000;
  await entorno.DB.prepare(
    "INSERT INTO fallos (quien, cuantos, hasta) VALUES (?, 1, ?) " +
    "ON CONFLICT(quien) DO UPDATE SET " +
    "cuantos = CASE WHEN fallos.hasta < ? THEN 1 ELSE fallos.cuantos + 1 END, hasta = ?"
  ).bind(quien, hasta, Date.now(), hasta).run();
}

async function limpiarFallos(entorno, quien) {
  await entorno.DB.prepare("DELETE FROM fallos WHERE quien = ?").bind(quien).run();
}


const MAX_PETICION = 128 * 1024;

async function leerJSON(peticion) {
  const dice = parseInt(peticion.headers.get("content-length") || "0", 10);
  if (Number.isFinite(dice) && dice > MAX_PETICION) return null;
  try {
    const texto = await peticion.text();
    if (texto.length > MAX_PETICION) return null;
    return JSON.parse(texto);
  } catch (e) {
    return null;
  }
}

