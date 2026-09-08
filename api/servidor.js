// El servidor de la academia de Fal.
//
// Hace tres cosas y ninguna mas: crear una cuenta, entrar con ella, y
// guardar y devolver por donde va el alumno. Corre en Cloudflare Workers,
// que en su plan gratuito no cobra nada y no se apaga por falta de visitas.
//
// Lo que se guarda de una persona: el nombre que ella misma se pone, algo
// con lo que comprobar su contraseña, y su progreso. No se pide correo, no
// se pide nombre real y no se apunta de donde entra. Un curso de
// programacion no necesita saber quien eres, y lo que no se guarda no se
// puede perder ni filtrar.
//
// LA DECISION QUE MAS EXTRAÑA DE ESTE ARCHIVO
//
// El estirado de la contraseña se hace en el navegador, no aqui. El plan
// gratuito de Workers da 10 milisegundos de CPU por peticion, y un PBKDF2
// con las vueltas que hoy se recomiendan gasta bastante mas que eso, asi
// que hacerlo en el servidor obligaria a pagar o a bajar las vueltas hasta
// dejarlo en un adorno.
//
// Asi que el reparto es este: el navegador aplica PBKDF2 con 300.000
// vueltas sobre la contraseña, y manda el resultado. Aqui se le pone encima
// un hash rapido con una sal propia y ESO es lo que se guarda. Sale bien
// porque quien se lleve esta base de datos sigue teniendo que pagar las
// 300.000 vueltas por cada contraseña que quiera probar, que es justo lo
// que se le pide a un buen hash. Lo que no se puede es saltarse el
// navegador: por eso la sesion viaja por HTTPS y solo por HTTPS.

import {
  VUELTAS_CLIENTE, nombreValido, estiradoValido, guardarSecreto,
  coincide, igualSinChivarse, resumen, alAzar, codigoDeRescate,
} from "./secretos.js";
import { repartirForo } from "./foro.js";
import { marcasDelCurso, apuntarMarcas } from "./marcas.js";

const MAX_PROGRESO = 64 * 1024;
const DIAS_DE_SESION = 180;
const FALLOS_PERMITIDOS = 8;
const MINUTOS_CASTIGO = 15;

// La puerta de entrada. La llama functions/api/[[camino]].js, que es lo que
// Cloudflare Pages ejecuta para cualquier dirección que empiece por /api/.
//
// Esto va en Pages y no en un Worker suelto por una razón de fontanería que
// no se ve desde aquí: un Worker con nombre propio exige que el dominio
// entero esté gestionado por Cloudflare, con los nameservers cambiados.
// Pages se conforma con un CNAME desde el registrador de siempre, así que
// api.fal-lang.org puede colgar del mismo dominio sin mover nada de lo que
// ya funciona. Y que cuelgue del mismo dominio es justo lo que hace que la
// cookie de sesión viaje: desde otro nombre el navegador la tiraría.
export async function manejar(peticion, entorno) {
  const origen = permitido(peticion, entorno);
  if (peticion.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cabeceras(origen) });
  }

  // Nada que cambie algo se acepta desde una página que no sea la academia.
  // El navegador ya lo impide por su cuenta, pero eso solo protege a quien
  // usa un navegador: cualquiera puede montar una petición a mano.
  if (peticion.method !== "GET" && !esOrigenBueno(peticion, entorno)) {
    return responder({ error: "esa página no puede pedir esto" }, 403, origen);
  }

  const ruta = new URL(peticion.url).pathname.replace(/\/+$/, "");
  try {
    const respuesta = await repartir(ruta, peticion, entorno);
    for (const [k, v] of Object.entries(cabeceras(origen))) {
      respuesta.headers.set(k, v);
    }
    return respuesta;
  } catch (fallo) {
    // Nunca sale el detalle hacia fuera. Un mensaje de error de la base de
    // datos cuenta como esta hecha por dentro, y eso es media faena para
    // quien esta buscando por donde entrar.
    console.error(fallo && fallo.stack ? fallo.stack : fallo);
    return responder({ error: "algo se ha roto aqui dentro" }, 500, origen);
  }
}

async function repartir(ruta, peticion, entorno) {
  const metodo = peticion.method;

  // El foro va aparte, en su propio archivo. Se mira antes que el resto
  // porque casi todo lo suyo se lee sin cuenta, y quién eres se averigua
  // una sola vez y se le pasa hecho.
  if (ruta.startsWith("/api/foro/")) {
    const quienEs = await deLaSesion(peticion, entorno);
    const respuesta = await repartirForo(ruta, peticion, entorno, quienEs);
    if (respuesta) return respuesta;
  }

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

// Solo contestan las paginas de la academia. Un navegador no deja que otra
// web use la sesion de esta si el origen no esta en esta lista.
function listaDeOrigenes(entorno) {
  return (entorno.ORIGENES || "").split(",").map((o) => o.trim()).filter(Boolean);
}

function permitido(peticion, entorno) {
  const origen = peticion.headers.get("Origin") || "";
  const buenos = listaDeOrigenes(entorno);
  return buenos.includes(origen) ? origen : buenos[0] || "";
}

// Si el navegador dice de qué página viene, tiene que ser una de las
// nuestras. Sin cabecera de origen no se acepta nada que cambie datos,
// porque eso es lo que trae una petición fabricada a mano.
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

function responder(cuerpo, estado, origen, extra) {
  const h = {
    "content-type": "application/json; charset=utf-8",
    ...cabeceras(origen || ""),
  };
  if (extra) Object.assign(h, extra);
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: h });
}

// --- Cuentas -------------------------------------------------------------


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

  // El codigo de rescate se enseña una vez y no se vuelve a poder ver,
  // porque de el solo se guarda el hash. Es la unica forma de recuperar la
  // cuenta: sin correo no hay a donde mandar un enlace.
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

  const fila = await entorno.DB.prepare("SELECT id, usuario, clave FROM alumnos WHERE llave = ?")
    .bind(llave).first();

  // Se comprueba igual aunque la cuenta no exista, para que el tiempo de
  // respuesta no diga si el nombre esta cogido. Sin esto, cualquiera puede
  // sacar la lista de quien tiene cuenta preguntando uno por uno.
  const contra = fila ? fila.clave : "x$0000000000000000000000000000000000000000000000000000000000000000";
  const vale = await coincide(estirado, contra);

  if (!fila || !vale) {
    await apuntarFallo(entorno, llave);
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
    "Set-Cookie": `sesion=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  });
}

async function quienSoy(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ dentro: false }, 200);
  return responder({ dentro: true, usuario: alumno.usuario }, 200);
}

// Cambiar la contraseña con el codigo que se dio al registrarse. Es lo que
// sustituye al "he olvidado mi contraseña" de toda la vida, que necesita un
// correo al que escribir.
async function rescatar(peticion, entorno) {
  const cuerpo = await leerJSON(peticion);
  if (!cuerpo) return responder({ error: "no entiendo lo que me mandas" }, 400);
  const { usuario, rescate, estirado } = cuerpo;
  if (!nombreValido(usuario) || !estiradoValido(estirado) || typeof rescate !== "string") {
    return responder({ error: "Faltan datos." }, 400);
  }
  const llave = usuario.toLowerCase();
  if (await castigado(entorno, "r:" + llave)) {
    return responder({ error: "Demasiados intentos. Espera un cuarto de hora." }, 429);
  }
  const fila = await entorno.DB.prepare("SELECT id, rescate FROM alumnos WHERE llave = ?")
    .bind(llave).first();
  if (!fila || !(await coincide(rescate.trim().toUpperCase(), fila.rescate))) {
    await apuntarFallo(entorno, "r:" + llave);
    return responder({ error: "Ese codigo de rescate no es." }, 401);
  }

  // Contraseña nueva, codigo nuevo, y fuera todas las sesiones abiertas: si
  // alguien habia entrado con la contraseña vieja, aqui se queda fuera.
  const nuevo = codigoDeRescate();
  await entorno.DB.prepare("UPDATE alumnos SET clave = ?, rescate = ? WHERE id = ?")
    .bind(await guardarSecreto(estirado), await guardarSecreto(nuevo), fila.id).run();
  await entorno.DB.prepare("DELETE FROM sesiones WHERE alumno = ?").bind(fila.id).run();
  await limpiarFallos(entorno, "r:" + llave);

  const galleta = await abrirSesion(entorno, fila.id);
  return responder({ usuario, rescate: nuevo }, 200, null, { "Set-Cookie": galleta });
}

// Que alguien pueda borrarse entero, sin pedirlo por escrito a nadie. Es lo
// justo y ademas es lo que evita tener que atender solicitudes a mano.
async function borrarme(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ error: "no has entrado" }, 401);
  await entorno.DB.batch([
    entorno.DB.prepare("DELETE FROM progreso WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM sesiones WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM alumnos WHERE id = ?").bind(alumno.id),
  ]);
  return responder({ hecho: true }, 200, null, {
    "Set-Cookie": `sesion=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  });
}

// --- Progreso ------------------------------------------------------------

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

  // Se guarda una version limpia y no lo que venga. Nadie puede usar esto
  // como disco duro gratis ni meter aqui dentro cosas que luego se pinten
  // en la pagina de otro.
  const limpio = {
    hechas: (Array.isArray(cuerpo.progreso.hechas) ? cuerpo.progreso.hechas : [])
      .filter((n) => Number.isInteger(n) && n >= 0 && n < 500).slice(0, 500),
    actual: Number.isInteger(cuerpo.progreso.actual) ? Math.max(0, Math.min(499, cuerpo.progreso.actual)) : 0,
    // En cuáles se miró la solución. Se guarda para poder dar la marca de
    // haberlo sacado solo, y por eso llega del navegador y no se puede
    // comprobar: quien se engañe con esto solo se engaña a sí mismo, que es
    // un precio razonable por no vigilar a nadie.
    mirados: (Array.isArray(cuerpo.progreso.mirados) ? cuerpo.progreso.mirados : [])
      .filter((n) => Number.isInteger(n) && n >= 0 && n < 500).slice(0, 500),
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

  // Las marcas se reparten aquí, mirando lo que se acaba de guardar. Se
  // deciden en el servidor a partir del progreso de verdad, así que no hay
  // forma de pedirse una desde el navegador.
  const ganadas = await apuntarMarcas(entorno, alumno.id, marcasDelCurso(alumno.id, limpio));
  return responder({ hecho: true, marcas: ganadas }, 200);
}

// --- Sesiones ------------------------------------------------------------

async function abrirSesion(entorno, alumno) {
  const testigo = alAzar(32);
  const ahora = Date.now();
  await entorno.DB.prepare(
    "INSERT INTO sesiones (testigo, alumno, creada, vista) VALUES (?, ?, ?, ?)"
  ).bind(await resumen(testigo), alumno, ahora, ahora).run();

  const segundos = DIAS_DE_SESION * 24 * 60 * 60;
  // HttpOnly para que ningun script pueda leerla, Secure para que no salga
  // sin cifrar, y Lax porque la pagina y esto viven bajo el mismo dominio.
  return `sesion=${testigo}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`;
}

function galletaDe(peticion) {
  const crudo = peticion.headers.get("Cookie") || "";
  for (const trozo of crudo.split(";")) {
    const [nombre, ...resto] = trozo.trim().split("=");
    if (nombre === "sesion") return resto.join("=");
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

// --- Intentos fallidos ---------------------------------------------------

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

// --- Utilidades ----------------------------------------------------------

async function leerJSON(peticion) {
  try {
    const texto = await peticion.text();
    if (texto.length > 128 * 1024) return null;
    return JSON.parse(texto);
  } catch (e) {
    return null;
  }
}

