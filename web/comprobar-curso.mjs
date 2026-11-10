
import { LECCIONES, MODULOS } from "./curso.js";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FAL = process.env.FAL || "../api/fal-linux";
const carpeta = mkdtempSync(join(tmpdir(), "curso-"));

function limpia(t) {
  return String(t).trim().split("\n").map((l) => l.trim()).join("\n").toLowerCase();
}

let mal = 0;
let moduloActual = -1;

for (const [i, l] of LECCIONES.entries()) {
  if (l.modulo !== moduloActual) {
    moduloActual = l.modulo;
    console.log("\n" + MODULOS[moduloActual]);
  }

  const nombre = `${i + 1}. ${l.titulo}`;
  const fallos = [];

  if (!l.solucion) fallos.push("no tiene solución escrita");

  for (const palabra of l.debeUsar || []) {
    if (!new RegExp("\\b" + palabra + "\\b").test(l.solucion || "")) {
      fallos.push(`la solución no usa "${palabra}", que el ejercicio exige`);
    }
  }

  if (l.inicial && l.solucion && !l.modifica && !l.solucion.startsWith(l.inicial.trimEnd())) {
    fallos.push("el código de partida no encaja con el principio de la solución");
  }

  let salida = "";
  if (l.solucion) {
    const archivo = join(carpeta, `l${i}.fal`);
    writeFileSync(archivo, l.solucion + "\n");
    try {
      salida = execFileSync(FAL, [archivo], {
        encoding: "utf8",
        input: (l.entradas || "") + "\n",
        timeout: 10000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (fallo) {
      const texto = (fallo.stdout || "") + (fallo.stderr || "");
      fallos.push("el intérprete se queja:\n      " + texto.trim().split("\n").join("\n      "));
    }
  }

  if (l.dibuja) {
    if (fallos.length === 0 && !/dibujo guardado/i.test(salida)) {
      fallos.push("no llegó a dibujar nada: " + JSON.stringify(salida.trim()));
    }
  } else if (fallos.length === 0 && limpia(salida) !== limpia(l.espera)) {
    fallos.push(
      `esperaba ${JSON.stringify(l.espera)}\n      y salió  ${JSON.stringify(salida.trim())}`
    );
  }

  if (fallos.length === 0) {
    console.log("  bien:", nombre);
    continue;
  }
  mal++;
  console.log("  MAL :", nombre);
  for (const f of fallos) console.log("      " + f);
}

console.log("");
console.log(`${LECCIONES.length} lecciones en ${MODULOS.length} módulos.`);
if (mal > 0) {
  console.error(`${mal} con problemas.\n`);
  process.exit(1);
}
console.log("Todas las soluciones dan lo que su lección promete.\n");
