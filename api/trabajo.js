
export const CEROS_REGISTRO = 18;
export const CEROS_ENTRAR = 16;

const VENTANA = 5 * 60 * 1000;

export function ventanaAhora() {
  return Math.floor(Date.now() / VENTANA);
}

export function semillaDeRegistro(usuario, ventana) {
  return "registro:" + usuario.toLowerCase() + ":" + ventana;
}

export function semillaDeEntrada(usuario, ventana, fallos) {
  return "entrar:" + usuario.toLowerCase() + ":" + ventana + ":" + fallos;
}

export function semillaDeRescate(usuario, ventana, fallos) {
  return "rescate:" + usuario.toLowerCase() + ":" + ventana + ":" + fallos;
}

function cerosDelante(bytes) {
  let ceros = 0;
  for (const b of bytes) {
    if (b !== 0) return ceros + Math.clz32(b) - 24;
    ceros += 8;
  }
  return ceros;
}

export async function trabajoHecho(hacerSemilla, nonce, ceros) {
  if (typeof nonce !== "string" || !/^[0-9]{1,12}$/.test(nonce)) return false;
  const ahora = ventanaAhora();
  for (const ventana of [ahora, ahora - 1]) {
    const texto = hacerSemilla(ventana) + ":" + nonce;
    const resumen = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto))
    );
    if (cerosDelante(resumen) >= ceros) return true;
  }
  return false;
}
