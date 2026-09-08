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
import {
  CEROS_REGISTRO, CEROS_ENTRAR, ventanaAhora,
  semillaDeRegistro, semillaDeEntrada, trabajoHecho,
} from "./trabajo.js";
import { marcasDelCurso, apuntarMarcas } from "./marcas.js";

const MAX_PROGRESO = 64 * 1024;
const DIAS_DE_SESION = 180;
const FALLOS_PERMITIDOS = 8;
const MINUTOS_CASTIGO = 15;

// Cuantas cuentas nuevas se admiten por hora en todo el sitio.
//
// Entrar tenia freno desde el principio y registrarse no tenia ninguno:
// cualquiera podia crear cuentas en bucle. Sin guardar la IP no hay forma
// de frenar por persona, asi que se frena el total.
//
// Es tosco, y hay que decirlo: alguien empeñado puede agotar el cupo de una
// hora y dejar sin registrarse a quien llegue detras. Pero ese daño dura
// una hora y se arregla solo, mientras que el de dejar la puerta abierta es
// que un programa cree diez mil cuentas en un minuto, se quede con las cien
// plazas de fundador y se lleve por delante el cupo diario de escrituras de
// la base de datos, que en el plan gratuito son cien mil.
//
// Veinte a la hora es de sobra para lo que este sitio va a recibir de
// verdad, y ridiculo para lo que necesita un programa.
const REGISTROS_POR_HORA = 20;

// Va en la tabla de fallos, con una llave que lleva espacios. nombreValido()
// no admite espacios, asi que ningun nombre de persona puede chocar con
// esta ni al derecho ni al reves.
const CUPO_REGISTROS = "registros globales";

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
    return new Response(null, { status: 204, headers: { ...SEGURIDAD, ...cabeceras(origen) } });
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
    // Las del foro se construyen en foro.js y no pasan por responder(), así
    // que las cabeceras de seguridad hay que ponérselas aquí o se irían sin
    // ellas. Es el punto por el que sale todo, sin excepción.
    for (const [k, v] of Object.entries({ ...SEGURIDAD, ...cabeceras(origen) })) {
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

// Lo que se le dice al navegador sobre cada respuesta de este servidor.
//
// Aquí no sale nunca una página, solo JSON, así que se puede cerrar del
// todo: ni scripts, ni marcos, ni que nadie meta esto dentro de un iframe
// para engañar a quien pulsa. Y sin caché en ninguna parte, porque por aquí
// pasa quién eres y una respuesta guardada en un proxy es la respuesta de
// otro.
const SEGURIDAD = {
  // Este servidor no devuelve nada que un navegador deba ejecutar ni
  // enseñar. La política más cerrada posible es la correcta.
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  // Que no adivine el tipo de contenido: si digo que es JSON, es JSON, y no
  // algo que decide tratar como HTML porque el principio se lo parece.
  "X-Content-Type-Options": "nosniff",
  // La dirección de esta página no viaja a ningún sitio al salir de aquí.
  "Referrer-Policy": "no-referrer",
  // Ni cámara, ni micrófono, ni ubicación, ni nada. No se usan.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  // Dos años, subdominios incluidos: una vez que un navegador ha estado
  // aquí, no vuelve a intentarlo sin cifrar aunque le den un enlace http.
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

// --- Cuentas -------------------------------------------------------------


// La semilla para registrarse. Se pide antes de mandar el formulario.
//
// No hace falta guardar nada de lo que se reparte aqui: la semilla se
// deduce del nombre y de la hora, asi que el servidor puede recalcularla al
// comprobarla. En un plan gratuito con cupo de escrituras, un reto que
// hubiera que apuntar en la base de datos seria una forma preciosa de
// tumbar el sitio pidiendo retos.
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

  // La prueba de trabajo va antes que el cupo: si no, alguien podria
  // gastar las plazas de la hora sin pagar nada por ellas.
  if (!(await trabajoHecho((v) => semillaDeRegistro(usuario, v), cuerpo.nonce, CEROS_REGISTRO))) {
    return responder({
      error: "Falta la comprobacion. Recarga la pagina y vuelve a intentarlo.",
    }, 400);
  }

  // El cupo se mira aqui, cuando ya se sabe que el nombre vale y que esta
  // libre, para que probar nombres ocupados no gaste plazas de nadie.
  if (!(await hayCupoParaRegistrar(entorno))) {
    return responder({
      error: "Se estan creando muchas cuentas ahora mismo. Vuelve dentro de un rato.",
    }, 429);
  }

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

  // La prueba de trabajo solo aparece cuando ya se ha fallado alguna vez
  // con este nombre. Quien acierta la contraseña a la primera, que es lo
  // que hace la gente, no espera nada en absoluto; quien esta probando
  // contraseñas paga medio segundo de maquina por cada una.
  //
  // El numero de fallos va dentro de la semilla, y sube con cada intento,
  // asi que la solucion de un intento no sirve para el siguiente. Sin eso
  // se resolveria una vez y se probarian mil contraseñas con ella.
  const fallos = await cuantosFallos(entorno, llave);
  if (fallos > 0) {
    const hecho = await trabajoHecho(
      (v) => semillaDeEntrada(usuario, v, fallos), cuerpo.nonce, CEROS_ENTRAR
    );
    if (!hecho) {
      // Esto no dice si la cuenta existe: se apunta un fallo con cualquier
      // nombre que se pruebe, exista o no.
      return responder({
        error: "Ese nombre o esa contraseña no son.",
        reto: { semilla: semillaDeEntrada(usuario, ventanaAhora(), fallos), ceros: CEROS_ENTRAR },
      }, 401);
    }
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
// Borrar la cuenta. De verdad, no marcarla como inactiva.
//
// Esto se escribio cuando no habia foro, y se quedo borrando tres tablas de
// las nueve que acabaron apuntando a una cuenta. Con las claves ajenas
// activas, eso no dejaba una cuenta a medio borrar: hacia que la fila de
// alumnos no se pudiera borrar en absoluto, asi que cualquiera con una
// marca (o sea, cualquiera que hubiera guardado progreso) se encontraba con
// un error al pedir que le borraran los datos.
async function borrarme(peticion, entorno) {
  const alumno = await deLaSesion(peticion, entorno);
  if (!alumno) return responder({ error: "no has entrado" }, 401);
  const llave = alumno.usuario.toLowerCase();

  await entorno.DB.batch([
    // Antes de quitar sus votos, devolver la cuenta a los mensajes que
    // habia marcado, o el numero se queda inflado para siempre.
    entorno.DB.prepare(
      "UPDATE mensajes SET ayudas = ayudas - 1 " +
      "WHERE id IN (SELECT mensaje FROM ayudas WHERE alumno = ?)"
    ).bind(alumno.id),
    entorno.DB.prepare("DELETE FROM ayudas WHERE alumno = ?").bind(alumno.id),

    // Lo que escribio en el foro: el texto se vacia de verdad y el mensaje
    // queda como borrado. Lo que no se hace es quitar la fila, porque un
    // hilo al que le faltan las preguntas son diez respuestas sin sentido.
    // El titulo del tema si se queda, para que la conversacion conserve su
    // forma; quien quiera que desaparezca tambien, lo pide y se quita.
    entorno.DB.prepare(
      "UPDATE mensajes SET cuerpo = '', oculto = 1, autor = 0 WHERE autor = ?"
    ).bind(alumno.id),
    entorno.DB.prepare("UPDATE temas SET autor = 0 WHERE autor = ?").bind(alumno.id),

    entorno.DB.prepare("DELETE FROM marcas WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM moderadores WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM progreso WHERE alumno = ?").bind(alumno.id),
    entorno.DB.prepare("DELETE FROM sesiones WHERE alumno = ?").bind(alumno.id),
    // Esta va por nombre y no por numero, que es justo por lo que se
    // quedaba sin borrar.
    entorno.DB.prepare("DELETE FROM fallos WHERE quien = ?").bind(llave),
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

// Si queda sitio en el cupo de esta hora, lo apunta y dice que si. La
// ventana no es de reloj: empieza con la primera cuenta y dura una hora
// desde ahi.
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

// Cuantos intentos fallidos lleva ese nombre. Cero si no hay ninguno o si
// el castigo ya caduco: pasado el rato, se empieza de nuevo.
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

