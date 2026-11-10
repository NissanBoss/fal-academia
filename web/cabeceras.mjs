
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const archivo = process.argv[2];
const paraMeta = process.argv.includes("--meta");
if (!archivo) {
  console.error("uso: node cabeceras.mjs <archivo.html> [--meta]");
  process.exit(1);
}

const html = readFileSync(archivo, "utf8");

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
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval' " + scripts.join(" "),
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.fal-lang.org",
  "img-src 'self' data:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'none'",
];

if (!paraMeta) reglas.push("frame-ancestors 'none'");

console.log(reglas.join("; "));
