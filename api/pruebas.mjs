// Pruebas de las piezas de las que depende que una cuenta sea una cuenta.
//
// Se ejecutan con Node, que trae la misma WebCrypto que hay en el navegador
// y en Workers, asi que lo que pasa aqui es lo que va a pasar alli:
//
//   node pruebas.mjs
//
// Lo que mas importa comprobar es que el estirado del navegador y la
// comprobacion del servidor encajan. Son dos archivos distintos, escritos
// por separado, y si el numero de vueltas o la sal se separan un dia, todo
// seguira compilando y nadie podra entrar.

import * as paraPruebas from "./secretos.js";
import { VUELTAS_CLIENTE } from "./secretos.js";
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

// Copia exacta de lo que hace el navegador en web/cuenta.js. Si esto deja de
// coincidir con aquello, la prueba de mas abajo lo caza.
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

console.log("");
if (fallos > 0) {
  console.error(fallos + " prueba(s) mal.\n");
  process.exit(1);
}
console.log("Todo bien.\n");
