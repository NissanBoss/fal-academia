
export const VUELTAS_CLIENTE = 300000;

export function nombreValido(usuario) {
  return typeof usuario === "string" && /^[a-zA-Z0-9_-]{3,24}$/.test(usuario);
}

export function estiradoValido(texto) {
  return typeof texto === "string" && /^[a-f0-9]{64}$/.test(texto);
}

export async function guardarSecreto(texto) {
  const sal = alAzar(16);
  return "s1$" + sal + "$" + (await resumen(sal + ":" + texto));
}

export const SENUELO = "s1$" + "0".repeat(32) + "$" + "0".repeat(64);

export async function coincide(texto, guardado) {
  const trozos = String(guardado).split("$");
  if (trozos.length !== 3 || trozos[0] !== "s1") return false;
  const esperado = await resumen(trozos[1] + ":" + texto);
  return igualSinChivarse(esperado, trozos[2]);
}

export function igualSinChivarse(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

export async function resumen(texto) {
  const bytes = new TextEncoder().encode(texto);
  const digerido = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digerido)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function alAzar(bytes) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function codigoDeRescate() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  let salida = "";
  for (let i = 0; i < buffer.length; i++) {
    if (i > 0 && i % 5 === 0) salida += "-";
    salida += letras[buffer[i] % letras.length];
  }
  return salida;
}
