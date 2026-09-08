// Mete la politica de contenidos dentro de la propia pagina.
//
//   node poner-politica.mjs index.html foro.html
//
// GitHub Pages no deja poner cabeceras propias: sirve archivos y punto. La
// unica forma de que estas paginas lleven politica de contenidos es una
// etiqueta meta dentro del HTML, que cubre casi todo menos frame-ancestors.
// Contra que metan la pagina en un marco ajeno no se puede hacer nada desde
// ahi, y por eso el foro de verdad vive en Cloudflare, que si manda
// cabeceras.
//
// Esto corre al publicar, sobre la copia que se sube, y no sobre el archivo
// que se edita: un hash escrito en el fuente se queda viejo en cuanto
// alguien toca una linea, y una politica vieja rompe la pagina sin decir
// por que.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const archivos = process.argv.slice(2);
if (!archivos.length) {
  console.error("uso: node poner-politica.mjs <archivo.html> [...]");
  process.exit(1);
}

const YA_ESTA = /<meta http-equiv="Content-Security-Policy"[^>]*>\n?/i;

for (const archivo of archivos) {
  const politica = execFileSync(
    process.execPath,
    [join(aqui, "cabeceras.mjs"), archivo, "--meta"],
    { encoding: "utf8" }
  ).trim();

  let html = readFileSync(archivo, "utf8").replace(YA_ESTA, "");

  // Va lo primero de todo dentro de la cabecera. Una politica que llega
  // despues de algo no protege a lo que ya se leyo.
  const ancla = "<meta charset=\"utf-8\">\n";
  if (!html.includes(ancla)) {
    console.error(archivo + ": no encuentro donde meterla");
    process.exit(1);
  }
  const etiqueta = '<meta http-equiv="Content-Security-Policy" content="' + politica + '">\n';
  html = html.replace(ancla, ancla + etiqueta);
  writeFileSync(archivo, html);

  const cuantos = (politica.match(/sha256-/g) || []).length;
  console.log(archivo + ": politica puesta, " + cuantos + " script(s) por hash");
}
