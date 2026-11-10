
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
const CONTRA_MARCOS = "<style>html.en-marco{display:none}</style>\n" +
  "<script>if (window.top !== window.self) document.documentElement.classList.add(\"en-marco\");</script>\n";

for (const archivo of archivos) {
  let html = readFileSync(archivo, "utf8").replace(YA_ESTA, "").replace(CONTRA_MARCOS, "");

  const ancla = "<meta charset=\"utf-8\">\n";
  if (!html.includes(ancla)) {
    console.error(archivo + ": no encuentro donde meterla");
    process.exit(1);
  }

  html = html.replace(ancla, ancla + CONTRA_MARCOS);
  writeFileSync(archivo, html);
  const politica = execFileSync(
    process.execPath,
    [join(aqui, "cabeceras.mjs"), archivo, "--meta"],
    { encoding: "utf8" }
  ).trim();

  const etiqueta = '<meta http-equiv="Content-Security-Policy" content="' + politica + '">\n';
  html = html.replace(ancla, ancla + etiqueta);
  writeFileSync(archivo, html);

  const cuantos = (politica.match(/sha256-/g) || []).length;
  console.log(archivo + ": politica puesta, " + cuantos + " script(s) por hash");
}
