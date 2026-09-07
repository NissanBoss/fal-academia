// Contraseñas, códigos y comparaciones.
//
// Esto vive fuera del worker por una razón que costó descubrir: el runtime
// de Cloudflare mira lo que exporta el archivo principal y **rechaza el
// despliegue entero** si encuentra algo que no sea un handler. Tener aquí
// unas cuantas funciones sueltas para poder probarlas hacía que el servidor
// ni siquiera arrancara, con un error que no menciona la palabra "export":
//
//   Incorrect type for map entry 'VUELTAS_CLIENTE': the provided value is
//   not of type 'function or ExportedHandler'.
//
// Así que las piezas comprobables se sacan a este módulo, el worker las
// importa y las pruebas también. Sale mejor de todas formas: lo que hay
// aquí no sabe nada de peticiones ni de bases de datos, y se puede leer
// entero sin tener el resto en la cabeza.

// El navegador tiene que usar exactamente estas vueltas o nadie podrá
// entrar. Está comprobado en pruebas.mjs, que lee los dos archivos.
export const VUELTAS_CLIENTE = 300000;

// El nombre se deja corto y sin sorpresas a propósito. Un nombre con
// espacios raros o con letras que se ven igual que otras es la vía para
// hacerse pasar por alguien.
export function nombreValido(usuario) {
  return typeof usuario === "string" && /^[a-zA-Z0-9_-]{3,24}$/.test(usuario);
}

// Lo que llega del navegador ya es el resultado de PBKDF2, así que tiene
// una forma fija y comprobable. Si no la tiene, es que alguien está
// llamando a mano y saltándose el estirado.
export function estiradoValido(texto) {
  return typeof texto === "string" && /^[a-f0-9]{64}$/.test(texto);
}

// Al estirado que llega del navegador se le pone una sal de aquí y un hash
// rápido. Lo caro ya lo pagó el navegador; esto solo evita que quien se
// lleve la base pueda usar lo que hay dentro tal cual.
export async function guardarSecreto(texto) {
  const sal = alAzar(16);
  return "s1$" + sal + "$" + (await resumen(sal + ":" + texto));
}

export async function coincide(texto, guardado) {
  const trozos = String(guardado).split("$");
  if (trozos.length !== 3 || trozos[0] !== "s1") return false;
  const esperado = await resumen(trozos[1] + ":" + texto);
  return igualSinChivarse(esperado, trozos[2]);
}

// Comparar sin que el tiempo diga cuántas letras se acertaron.
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

// Sin las letras que se confunden al copiarlas a mano: ni O ni 0, ni I ni 1.
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
