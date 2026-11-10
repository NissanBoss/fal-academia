
import * as paraPruebas from "./contrasenas.js";
import { VUELTAS_CLIENTE } from "./contrasenas.js";
import { limpiar, resumir } from "./foro.js";
import { SENUELO } from "./contrasenas.js";
import {
  modulosCompletos, marcasDelCurso, puedeEscribir,
  LECCIONES_POR_MODULO, TOTAL_LECCIONES, FUNDADORES,
} from "./marcas.js";
import { readFileSync } from "node:fs";

const { guardarSecreto, coincide, codigoDeRescate, nombreValido, estiradoValido, igualSinChivarse } = paraPruebas;

let fallos = 0;
function comprueba(que, condicion) {
  if (condicion) {
    console.log("  bien:", que);
    return;
  }
  console.error("  MAL :", que);
  fallos++;
}

async function estirarComoElNavegador(usuario, clave) {
  const codificador = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw", codificador.encode(clave), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: codificador.encode("fal-academia:" + usuario.toLowerCase()),
      iterations: 300000,
      hash: "SHA-256",
    },
    material,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

console.log("\nEl navegador y el servidor hablan el mismo idioma");
{
  const cliente = readFileSync(new URL("../web/cuenta.js", import.meta.url), "utf8");
  const vueltasDelCliente = /iterations:\s*VUELTAS/.test(cliente)
    && /const VUELTAS = (\d+)/.exec(cliente)[1];
  comprueba(
    "las vueltas del navegador son las que el servidor espera (" + VUELTAS_CLIENTE + ")",
    Number(vueltasDelCliente) === VUELTAS_CLIENTE
  );
  comprueba(
    "la sal del navegador lleva el prefijo del sitio",
    cliente.includes('"fal-academia:" + usuario.toLowerCase()')
  );
  comprueba("la contraseña no se manda nunca tal cual", !/body:.*clave/.test(cliente));
  comprueba(
    "las llamadas mandan la galleta de sesion",
    cliente.includes('credentials: "include"')
  );
}

console.log("\nEl estirado tiene la forma que el servidor exige");
{
  const estirado = await estirarComoElNavegador("Ana", "una contraseña larga");
  comprueba("sale un resumen de 64 letras hexadecimales", estiradoValido(estirado));
  const otra = await estirarComoElNavegador("Ana", "una contraseña larga.");
  comprueba("cambiar una letra lo cambia entero", estirado !== otra);
  const otroUsuario = await estirarComoElNavegador("Bea", "una contraseña larga");
  comprueba(
    "la misma contraseña en dos cuentas da resultados distintos",
    estirado !== otroUsuario
  );
  const mayusculas = await estirarComoElNavegador("ANA", "una contraseña larga");
  comprueba("da igual como se escriba el nombre", estirado === mayusculas);
}

console.log("\nGuardar y comprobar una contraseña");
{
  const estirado = await estirarComoElNavegador("ana", "la de siempre");
  const guardado = await guardarSecreto(estirado);
  comprueba("lo guardado no es lo que llego", !guardado.includes(estirado));
  comprueba("lleva version y sal", guardado.split("$").length === 3 && guardado.startsWith("s1$"));
  comprueba("la contraseña buena entra", await coincide(estirado, guardado));

  const mala = await estirarComoElNavegador("ana", "la de siempre pero no");
  comprueba("una contraseña parecida no entra", !(await coincide(mala, guardado)));

  const otroGuardado = await guardarSecreto(estirado);
  comprueba(
    "dos cuentas con la misma contraseña se guardan distinto",
    guardado !== otroGuardado
  );

  for (const basura of ["", "x", "s1$solo-dos", "s2$aa$bb", null, undefined, 42]) {
    comprueba("no traga con " + JSON.stringify(basura), !(await coincide(estirado, basura)));
  }
}

console.log("\nEl codigo de rescate");
{
  const codigo = codigoDeRescate();
  comprueba("tiene la forma de siempre", /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(codigo));
  comprueba("no lleva letras que se confunden al copiarlas", !/[O0I1]/.test(codigo));
  const otros = new Set();
  for (let i = 0; i < 500; i++) otros.add(codigoDeRescate());
  comprueba("quinientos seguidos son quinientos distintos", otros.size === 500);

  const guardado = await guardarSecreto(codigo);
  comprueba("el bueno vale", await coincide(codigo, guardado));
  comprueba("otro no vale", !(await coincide(codigoDeRescate(), guardado)));
}

console.log("\nLos nombres que se aceptan");
{
  for (const bueno of ["ana", "Ana_Perez", "el-nino-99", "abc", "a".repeat(24)]) {
    comprueba("vale " + JSON.stringify(bueno), nombreValido(bueno));
  }
  for (const malo of [
    "ab", "a".repeat(25), "ana perez", "ana@casa", "añá", "", null, 42,
    "ana\nperez", "../../etc", "<script>", "ana;drop",
  ]) {
    comprueba("no vale " + JSON.stringify(malo), !nombreValido(malo));
  }
}

console.log("\nLo que llega haciendose pasar por un estirado");
{
  for (const malo of [
    "", "x", "A".repeat(64), "g".repeat(64), "a".repeat(63), "a".repeat(65), null, 42,
  ]) {
    comprueba("no cuela " + JSON.stringify(String(malo).slice(0, 12)), !estiradoValido(malo));
  }
}

console.log("\nComparar sin chivarse");
{
  comprueba("dos iguales son iguales", igualSinChivarse("abc", "abc"));
  comprueba("dos distintos no", !igualSinChivarse("abc", "abd"));
  comprueba("largos distintos no", !igualSinChivarse("abc", "abcd"));
  comprueba("nada raro pasa con vacios", igualSinChivarse("", ""));
}

console.log("\nLo que se le quita a un mensaje antes de guardarlo");
{
  comprueba("los saltos de linea se quedan", limpiar("uno\ndos", 100) === "uno\ndos");
  comprueba("el tabulador tambien", limpiar("si\tno", 100) === "si\tno");
  comprueba("las tildes y la ñ no se tocan", limpiar("año, ¿qué tal?", 100) === "año, ¿qué tal?");

  const conNulo = "hola" + String.fromCodePoint(0) + "mundo";
  comprueba("el byte cero se va", limpiar(conNulo, 100) === "holamundo");
  const conBorrar = "hola" + String.fromCodePoint(0x7f);
  comprueba("el de borrar se va", limpiar(conBorrar, 100) === "hola");

  for (const punto of [0x200b, 0x200e, 0x202e, 0x2066, 0xfeff]) {
    const conMarca = "ab" + String.fromCodePoint(punto) + "cd";
    comprueba(
      "fuera la marca invisible " + punto.toString(16),
      limpiar(conMarca, 100) === "abcd"
    );
  }

  comprueba("se recorta por el tope", limpiar("a".repeat(50), 10).length === 10);
  comprueba("los espacios de los bordes se van", limpiar("  hola  ", 100) === "hola");
  for (const basura of [null, undefined, 42, {}, []]) {
    comprueba("no revienta con " + JSON.stringify(basura), limpiar(basura, 10) === "");
  }
}

console.log("\nEl resumen que sale en un perfil");
{
  comprueba(
    "queda en una linea",
    resumir("uno\n\ndos\ntres") === "uno dos tres"
  );
  comprueba(
    "sin las comillas del bloque de codigo",
    resumir("mira:\n```\nescribe 1\n```\nya esta") === "mira: escribe 1 ya esta"
  );
  const largo = resumir("a".repeat(300));
  comprueba("se corta si es largo", largo.length === 181 && largo.endsWith("…"));
  comprueba("uno corto se queda entero", resumir("dos palabras") === "dos palabras");
}

console.log("\nQuien puede escribir y que marcas le tocan");
{
  const primerModulo = LECCIONES_POR_MODULO[0];
  const hechas = (cuantas) => Array.from({ length: cuantas }, (unused, i) => i);

  comprueba("sin nada, no", !puedeEscribir({ hechas: [] }));
  comprueba("sin progreso, tampoco", !puedeEscribir(null));
  comprueba(
    "con el primer modulo a medias, no",
    !puedeEscribir({ hechas: hechas(primerModulo - 1) })
  );
  comprueba(
    "con el primer modulo entero, si",
    puedeEscribir({ hechas: hechas(primerModulo) })
  );

  comprueba(
    "las lecciones sueltas no completan un modulo",
    modulosCompletos([0, 6, 12, 18]) === 0
  );
  comprueba(
    "el curso entero son todos los modulos",
    modulosCompletos(hechas(TOTAL_LECCIONES)) === LECCIONES_POR_MODULO.length
  );

  const repetida = Array(TOTAL_LECCIONES).fill(0);
  comprueba("una leccion repetida no completa un modulo", modulosCompletos(repetida) === 0);
  comprueba("ni deja escribir en el foro", !puedeEscribir({ hechas: repetida }));
  comprueba("ni da la marca del curso", !marcasDelCurso(500, { hechas: repetida }).includes("curso"));

  const deLosPrimeros = marcasDelCurso(1, { hechas: hechas(TOTAL_LECCIONES), mirados: [] });
  comprueba("la cuenta numero uno es fundador", deLosPrimeros.includes("fundador"));
  comprueba("y se lleva la del curso entero", deLosPrimeros.includes("curso"));
  comprueba("y la de sacarlo sin mirar", deLosPrimeros.includes("sin_mirar"));

  const masTarde = marcasDelCurso(FUNDADORES + 1, { hechas: hechas(TOTAL_LECCIONES), mirados: [] });
  comprueba("la de despues no es fundador", !masTarde.includes("fundador"));

  const sinSaber = marcasDelCurso(2, { hechas: hechas(TOTAL_LECCIONES) });
  comprueba("sin saber que miro, no hay marca", !sinSaber.includes("sin_mirar"));

  const mirandolo = marcasDelCurso(2, {
    hechas: hechas(TOTAL_LECCIONES),
    mirados: hechas(TOTAL_LECCIONES - 9),
  });
  comprueba("con nueve por su cuenta todavia no", !mirandolo.includes("sin_mirar"));

  comprueba(
    "nadie se lleva marcas por un progreso vacio",
    marcasDelCurso(FUNDADORES + 1, { hechas: [] }).length === 0
  );
}

console.log("\nLo que no se ve: el señuelo y la galleta");
{
  const trozos = SENUELO.split("$");
  comprueba("el señuelo tiene las tres partes", trozos.length === 3);
  comprueba("el señuelo empieza por la version que coincide() exige", trozos[0] === "s1");
  comprueba("la sal del señuelo mide lo que las de verdad", /^[0-9a-f]{32}$/.test(trozos[1]));
  comprueba("el resumen del señuelo mide lo que los de verdad", /^[0-9a-f]{64}$/.test(trozos[2]));

  const guardadoDeVerdad = await guardarSecreto("lo que sea");
  const formaDeVerdad = guardadoDeVerdad.split("$").map((t) => t.length);
  comprueba(
    "el señuelo tiene la misma forma que un secreto guardado de verdad",
    JSON.stringify(formaDeVerdad) === JSON.stringify(trozos.map((t) => t.length))
  );
  comprueba("y nada coincide con el", (await coincide("cualquier cosa", SENUELO)) === false);

  const servidor = readFileSync(new URL("./servidor.js", import.meta.url), "utf8");
  comprueba("la galleta lleva el prefijo __Host-", servidor.includes('"__Host-sesion"'));
  comprueba(
    "no queda ninguna galleta con el nombre viejo",
    !/[^-]\bsesion=/.test(servidor.replace(/\$\{GALLETA\}=/g, ""))
  );
  comprueba(
    "la galleta nunca sale sin Secure ni sin HttpOnly",
    !/\$\{GALLETA\}=[^`]*`/.test(servidor) ||
      servidor.match(/\$\{GALLETA\}=[^`]*`/g).every(
        (t) => t.includes("HttpOnly") && t.includes("Secure") && t.includes("SameSite=Lax")
      )
  );
  comprueba(
    "el cuerpo de una peticion se mide antes de leerlo",
    /content-length[\s\S]{0,200}await peticion\.text\(\)/.test(servidor)
  );

  const apuntes = servidor.match(/[^\n]*await apuntarFallo\([^\n]*/g) || [];
  comprueba(
    "solo se apuntan fallos de cuentas que existen",
    apuntes.length === 2 && apuntes.every((l) => /if \(fila\) await apuntarFallo/.test(l))
  );
  const rescate = servidor.slice(servidor.indexOf("async function rescatar"), servidor.indexOf("async function borrarme"));
  comprueba(
    "el rescate pide la prueba de trabajo antes de mirar el codigo",
    rescate.indexOf("trabajoHecho(") > 0 && rescate.indexOf("trabajoHecho(") < rescate.indexOf("coincide(")
  );

  const toml = readFileSync(new URL("./wrangler.toml", import.meta.url), "utf8");
  const origenes = /^ORIGENES = "([^"]*)"/m.exec(toml)[1].split(",");
  comprueba(
    "la API solo atiende al foro y al curso",
    JSON.stringify(origenes.sort()) ===
      JSON.stringify(["https://aprende.fal-lang.org", "https://foro.fal-lang.org"])
  );
}

console.log("\nAl entrar se juntan los dos progresos sin perder nada");
{
  globalThis.location = { hostname: "aprende.fal-lang.org", protocol: "https:" };
  globalThis.window = {};
  const { juntarProgresos } = await import("../web/cuenta.js");
  const junto = juntarProgresos(
    { hechas: [0, 1], actual: 1, borradores: {}, mirados: [] },
    { hechas: [2, 3], actual: 3, borradores: {}, mirados: [2] }
  );
  comprueba("las lecciones de los dos lados", JSON.stringify(junto.hechas) === "[0,1,2,3]");
  comprueba("las soluciones vistas tambien", JSON.stringify(junto.mirados) === "[2]");
}

console.log("");
if (fallos > 0) {
  console.error(fallos + " prueba(s) mal.\n");
  process.exit(1);
}
console.log("Todo bien.\n");
