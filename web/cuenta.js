// La parte de las cuentas que corre en el navegador.
//
// Aqui vive el trabajo caro de las contraseñas. La contraseña que escribe
// el alumno no sale nunca de su maquina: lo que viaja es el resultado de
// pasarla por PBKDF2 trescientas mil veces, y ese numero tiene que ser el
// mismo que espera el servidor o no coincidira nunca.
//
// Se hace aqui porque el plan gratuito de Cloudflare da diez milisegundos
// de procesador por peticion y esto gasta bastante mas. En un movil son dos
// o tres decimas de segundo, una sola vez al entrar, y a cambio el curso no
// cuesta dinero al mes.

// Contra qué servidor se habla. En una máquina de trabajo se apunta solo al
// `wrangler dev` de al lado, para poder probar el registro sin tocar el de
// verdad ni tener que acordarse de deshacer el cambio antes de publicar.
// Se reutiliza el mismo nombre de máquina que tenga la página, no uno
// fijo. Con la página en "localhost" y el servidor en "127.0.0.1" el
// navegador los considera dos sitios distintos, la cookie de sesión no
// viaja y todo contesta que no has entrado, que es exactamente el mismo
// fallo que daría en producción si la API no colgara de fal-lang.org.
const enCasa = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const API = window.FAL_API ||
  (enCasa ? location.protocol + "//" + location.hostname + ":8787" : "https://api.fal-lang.org");
const VUELTAS = 300000;

// La sal es el nombre del alumno con un prefijo de este sitio. Tiene que
// poder calcularse sin preguntarle nada al servidor, porque si no habria
// que pedirsela antes de entrar y eso diria de paso que nombres existen.
// El prefijo esta para que la misma contraseña en otro sitio no acabe
// dando el mismo resultado que aqui.
async function estirar(usuario, clave) {
  const codificador = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw", codificador.encode(clave), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: codificador.encode("fal-academia:" + usuario.toLowerCase()),
      iterations: VUELTAS,
      hash: "SHA-256",
    },
    material,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function llamar(camino, opciones) {
  const respuesta = await fetch(API + camino, {
    ...opciones,
    // Sin esto el navegador no manda la galleta de sesion y todo contesta
    // que no has entrado, aunque hayas entrado.
    credentials: "include",
    headers: { "content-type": "application/json", ...(opciones && opciones.headers) },
  });
  let cuerpo = {};
  try {
    cuerpo = await respuesta.json();
  } catch (e) {}
  if (!respuesta.ok) {
    const fallo = new Error(cuerpo.error || "No se ha podido conectar con la academia.");
    fallo.estado = respuesta.status;
    // Si el servidor pide una prueba de trabajo, viene aqui dentro y quien
    // llamo puede resolverla y volver a intentarlo.
    fallo.reto = cuerpo.reto;
    throw fallo;
  }
  return cuerpo;
}

// Resuelve la prueba de trabajo en un hilo aparte, para no congelar la
// pagina el segundo que tarda. Si por lo que sea no se puede abrir el hilo,
// se hace aqui mismo: mas vale una pagina tiesa un segundo que una que no
// deja registrarse.
function resolverReto(reto) {
  return new Promise((listo, falla) => {
    let obrero;
    try {
      obrero = new Worker(new URL("./obrero.js", import.meta.url), { type: "module" });
    } catch (e) {
      import("./trabajo.js").then((m) => listo(m.resolver(reto.semilla, reto.ceros)), falla);
      return;
    }
    obrero.onmessage = (aviso) => {
      obrero.terminate();
      if (aviso.data && aviso.data.error) falla(new Error(aviso.data.error));
      else listo(aviso.data);
    };
    obrero.onerror = () => {
      obrero.terminate();
      import("./trabajo.js").then((m) => listo(m.resolver(reto.semilla, reto.ceros)), falla);
    };
    obrero.postMessage({ semilla: reto.semilla, ceros: reto.ceros });
  });
}

export const cuenta = {
  async registrar(usuario, clave) {
    const estirado = await estirar(usuario, clave);
    // Antes de crear una cuenta hay que pagar un poco de trabajo. Se pide
    // la semilla, se resuelve aqui, y va con el resto.
    const reto = await llamar("/api/reto?usuario=" + encodeURIComponent(usuario), { method: "GET" });
    const { nonce } = await resolverReto(reto);
    return llamar("/api/registro", {
      method: "POST",
      body: JSON.stringify({ usuario, estirado, nonce }),
    });
  },

  // Entrar no pide trabajo la primera vez. Solo si ya se ha fallado antes
  // con ese nombre, y entonces el servidor manda la semilla dentro del
  // error y se reintenta una vez sin molestar a nadie.
  async entrar(usuario, clave) {
    const estirado = await estirar(usuario, clave);
    const mandar = (nonce) => llamar("/api/entrar", {
      method: "POST",
      body: JSON.stringify({ usuario, estirado, nonce }),
    });
    try {
      return await mandar();
    } catch (fallo) {
      if (!fallo.reto) throw fallo;
      const { nonce } = await resolverReto(fallo.reto);
      return mandar(nonce);
    }
  },

  async rescatar(usuario, codigo, claveNueva) {
    const estirado = await estirar(usuario, claveNueva);
    return llamar("/api/rescate", {
      method: "POST",
      body: JSON.stringify({ usuario, rescate: codigo, estirado }),
    });
  },

  salir() {
    return llamar("/api/salir", { method: "POST" });
  },

  borrarme() {
    return llamar("/api/borrarme", { method: "POST" });
  },

  async quienSoy() {
    try {
      return await llamar("/api/yo", { method: "GET" });
    } catch (e) {
      // Que la academia este caida no puede dejar a nadie sin poder
      // estudiar: se sigue con lo guardado en este navegador.
      return { dentro: false, sinConexion: true };
    }
  },

  async bajarProgreso() {
    const r = await llamar("/api/progreso", { method: "GET" });
    return r.progreso;
  },

  subirProgreso(progreso) {
    return llamar("/api/progreso", {
      method: "PUT",
      body: JSON.stringify({ progreso }),
    });
  },
};

// Juntar lo de aqui con lo de alla.
//
// El alumno puede haber avanzado en dos sitios sin estar dentro de su
// cuenta, asi que al entrar no se puede tirar ninguno de los dos progresos.
// Se quedan todas las lecciones hechas de ambos lados, y de cada ejercicio
// el texto mas largo, que es casi siempre el mas avanzado.
export function juntarProgresos(aqui, alla) {
  if (!alla) return aqui;
  if (!aqui) return alla;
  const hechas = new Set([...(aqui.hechas || []), ...(alla.hechas || [])]);
  const borradores = { ...(alla.borradores || {}) };
  for (const [leccion, texto] of Object.entries(aqui.borradores || {})) {
    const otro = borradores[leccion] || "";
    if (typeof texto === "string" && texto.length > otro.length) borradores[leccion] = texto;
  }
  return {
    hechas: [...hechas].sort((a, b) => a - b),
    actual: Math.max(aqui.actual || 0, alla.actual || 0),
    borradores,
  };
}

export { estirar, VUELTAS, API };
