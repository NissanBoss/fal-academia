// Calcula la politica de contenidos de una pagina.
//
//   node cabeceras.mjs foro.html          -> la de cabecera HTTP
//   node cabeceras.mjs foro.html --meta   -> la que cabe en una etiqueta meta
//
// Estas paginas llevan el script dentro del propio archivo. La forma facil
// de permitirlo es 'unsafe-inline', y esa es justo la que no sirve de nada:
// deja pasar cualquier script que alguien consiga meter en la pagina, que es
// exactamente contra lo que existe la politica. La forma buena es apuntar el
// hash del script que si es nuestro, y eso es lo que hace esto.
//
// Se calcula al publicar y no se escribe a mano porque un hash a mano es un
// hash que se queda viejo la primera vez que alguien toca una linea, y
// entonces la pagina deja de funcionar sin decir por que.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const archivo = process.argv[2];
const paraMeta = process.argv.includes("--meta");
if (!archivo) {
  console.error("uso: node cabeceras.mjs <archivo.html> [--meta]");
  process.exit(1);
}

const html = readFileSync(archivo, "utf8");

// Los scripts sueltos dentro de la pagina. Los que traen src son archivos
// aparte y los cubre 'self'; estos hay que nombrarlos uno a uno.
function hashesDe(etiqueta) {
  const patron = new RegExp("<" + etiqueta + "([^>]*)>([\\s\\S]*?)</" + etiqueta + ">", "gi");
  const salida = [];
  let coincidencia;
  while ((coincidencia = patron.exec(html)) !== null) {
    if (/\ssrc\s*=/i.test(coincidencia[1])) continue;
    const hash = createHash("sha256").update(coincidencia[2], "utf8").digest("base64");
    salida.push("'sha256-" + hash + "'");
  }
  return salida;
}

const scripts = hashesDe("script");
if (!scripts.length) {
  console.error(archivo + ": no hay ningun script dentro de la pagina, revisa esto");
  process.exit(1);
}

const reglas = [
  // Nada esta permitido salvo lo que se diga expresamente debajo.
  "default-src 'none'",
  // Los scripts propios, por hash, mas los archivos de este mismo sitio.
  // wasm-unsafe-eval es para el interprete de Fal, que es WebAssembly y sin
  // eso el navegador no lo deja arrancar.
  "script-src 'self' 'wasm-unsafe-eval' " + scripts.join(" "),
  // Los estilos si van con unsafe-inline, y es una decision, no un olvido:
  // el riesgo de un estilo colado es maquillar la pagina, no ejecutar nada,
  // y atar por hash una hoja de estilos que se toca cada dos por tres
  // significa romper la pagina cada vez que alguien cambia un color.
  "style-src 'self' 'unsafe-inline'",
  // A donde puede hablar la pagina: aqui mismo y el servidor de cuentas.
  "connect-src 'self' https://api.fal-lang.org",
  "img-src 'self' data:",
  "font-src 'self'",
  // El interprete corre en un trabajador aparte para no congelar la pagina.
  "worker-src 'self' blob:",
  // Que nadie pueda cambiar de donde cuelgan las direcciones relativas.
  "base-uri 'none'",
  // Aqui no hay formularios que manden nada a ningun sitio.
  "form-action 'none'",
];

// frame-ancestors no funciona dentro de una etiqueta meta: el navegador la
// ignora y ademas avisa por consola. Solo vale como cabecera de verdad.
if (!paraMeta) reglas.push("frame-ancestors 'none'");

console.log(reglas.join("; "));
