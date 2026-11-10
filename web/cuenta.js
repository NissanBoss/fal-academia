
const enCasa = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const API = window.FAL_API ||
  (enCasa ? location.protocol + "//" + location.hostname + ":8787" : "https://api.fal-lang.org");
const VUELTAS = 300000;

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
    fallo.reto = cuerpo.reto;
    throw fallo;
  }
  return cuerpo;
}

function resolverReto(reto, avisar) {
  return new Promise((listo, falla) => {
    const aMano = () => import("./trabajo.js")
      .then((m) => listo(m.resolver(reto.semilla, reto.ceros, avisar)), falla);

    let obrero;
    try {
      obrero = new Worker(new URL("./obrero.js", import.meta.url), { type: "module" });
    } catch (e) {
      aMano();
      return;
    }
    obrero.onmessage = (aviso) => {
      if (aviso.data && aviso.data.van !== undefined) {
        if (avisar) avisar(aviso.data.van);
        return;
      }
      obrero.terminate();
      if (aviso.data && aviso.data.error) falla(new Error(aviso.data.error));
      else listo(aviso.data);
    };
    obrero.onerror = () => {
      obrero.terminate();
      aMano();
    };
    obrero.postMessage({ semilla: reto.semilla, ceros: reto.ceros });
  });
}

export const cuenta = {
  async registrar(usuario, clave, avisar) {
    const estirado = await estirar(usuario, clave);
    const reto = await llamar("/api/reto?usuario=" + encodeURIComponent(usuario), { method: "GET" });
    const { nonce } = await resolverReto(reto, avisar);
    return llamar("/api/registro", {
      method: "POST",
      body: JSON.stringify({ usuario, estirado, nonce }),
    });
  },

  async entrar(usuario, clave, avisar) {
    const estirado = await estirar(usuario, clave);
    const mandar = (nonce) => llamar("/api/entrar", {
      method: "POST",
      body: JSON.stringify({ usuario, estirado, nonce }),
    });
    try {
      return await mandar();
    } catch (fallo) {
      if (!fallo.reto) throw fallo;
      const { nonce } = await resolverReto(fallo.reto, avisar);
      return mandar(nonce);
    }
  },

  async rescatar(usuario, codigo, claveNueva, avisar) {
    const estirado = await estirar(usuario, claveNueva);
    const mandar = (nonce) => llamar("/api/rescate", {
      method: "POST",
      body: JSON.stringify({ usuario, rescate: codigo, estirado, nonce }),
    });
    try {
      return await mandar();
    } catch (fallo) {
      if (!fallo.reto) throw fallo;
      const { nonce } = await resolverReto(fallo.reto, avisar);
      return mandar(nonce);
    }
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

export function juntarProgresos(aqui, alla) {
  if (!alla) return aqui;
  if (!aqui) return alla;
  const hechas = new Set([...(aqui.hechas || []), ...(alla.hechas || [])]);
  const borradores = { ...(alla.borradores || {}) };
  for (const [leccion, texto] of Object.entries(aqui.borradores || {})) {
    const otro = borradores[leccion] || "";
    if (typeof texto === "string" && texto.length > otro.length) borradores[leccion] = texto;
  }
  const mirados = new Set([...(aqui.mirados || []), ...(alla.mirados || [])]);
  return {
    hechas: [...hechas].sort((a, b) => a - b),
    actual: Math.max(aqui.actual || 0, alla.actual || 0),
    borradores,
    mirados: [...mirados].sort((a, b) => a - b),
  };
}

export { estirar, VUELTAS, API };
