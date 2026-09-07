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

const API = window.FAL_API || "https://api.fal-lang.org";
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
    throw fallo;
  }
  return cuerpo;
}

export const cuenta = {
  async registrar(usuario, clave) {
    const estirado = await estirar(usuario, clave);
    return llamar("/api/registro", {
      method: "POST",
      body: JSON.stringify({ usuario, estirado }),
    });
  },

  async entrar(usuario, clave) {
    const estirado = await estirar(usuario, clave);
    return llamar("/api/entrar", {
      method: "POST",
      body: JSON.stringify({ usuario, estirado }),
    });
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

export { estirar, VUELTAS };
