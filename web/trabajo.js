// La prueba de trabajo, por el lado del navegador.
//
// Antes de dejarte crear una cuenta, el servidor pide que tu maquina haya
// gastado un poco de esfuerzo. La idea no es adivinar si eres una persona,
// que es lo que intentan los captchas de letras torcidas y lo que un
// programa hace mejor que tu: la idea es que crear una cuenta cueste algo
// de verdad. A ti te cuesta un segundo y no te enteras. A quien quiera
// crear diez mil le cuesta tres horas de ordenador, y ese es todo el
// truco.
//
// No hay imagenes que descifrar, asi que funciona igual si no ves, si usas
// lector de pantalla o si estas en un movil viejo. Y no se carga nada de
// ningun servidor ajeno, que es lo que pasaria con un captcha de los que
// se alquilan.
//
// El trabajo consiste en encontrar un numero que, pegado a la semilla que
// manda el servidor, de un resumen SHA-256 que empiece por unos cuantos
// ceros. No hay forma de acertarlo pensando: solo se puede probar. Y
// comprobar que el numero vale es un solo resumen, o sea que al servidor no
// le cuesta nada.

// SHA-256 escrito aqui a mano, y no con crypto.subtle, por una razon de
// velocidad que no se ve venir: el de la plataforma es asincrono y cada
// llamada arrastra su promesa, asi que doscientas mil llamadas tardan
// segundos en puro papeleo. Este es sincrono y hace las doscientas mil en
// menos de uno.
//
// Solo sirve para mensajes de menos de 56 bytes, que caben en un unico
// bloque. Es todo lo que hace falta aqui, y quitar el bucle de bloques deja
// la funcion en la mitad. Si algun dia se le pasa algo mas largo, avisa en
// vez de devolver un resumen equivocado.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const w = new Uint32Array(64);

function resumenDeUnBloque(bytes, largo) {
  if (largo > 55) throw new Error("este resumen solo vale para mensajes cortos");

  // El relleno de SHA-256: un uno, ceros hasta el final, y el largo en bits
  // en los ultimos ocho bytes.
  for (let i = 0; i < 16; i++) w[i] = 0;
  for (let i = 0; i < largo; i++) w[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  w[largo >> 2] |= 0x80 << (24 - (largo % 4) * 8);
  w[15] = largo * 8;

  for (let i = 16; i < 64; i++) {
    const a = w[i - 15];
    const b = w[i - 2];
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
  }

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const ch = (e & f) ^ (~e & g);
    const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (S0 + maj) | 0;
    h = g; g = f; f = e; e = (d + t1) | 0;
    d = c; c = b; b = a; a = (t1 + t2) | 0;
  }

  // Solo hacen falta las dos primeras palabras: los ceros que se buscan
  // estan al principio y nunca se piden mas de sesenta y cuatro bits.
  return [(h0 + a) | 0, (h1 + b) | 0];
}

// Cuantos ceros seguidos trae el resumen por delante, contando en bits.
function cerosDelante(par) {
  const alto = par[0] >>> 0;
  if (alto !== 0) return Math.clz32(alto);
  const bajo = par[1] >>> 0;
  return 32 + (bajo === 0 ? 32 : Math.clz32(bajo));
}

// Busca el numero que hace falta. Va de un tiron y sin soltar el turno,
// porque esto no corre en la pagina: corre dentro de obrero.js, en su
// propio hilo, donde bloquear no molesta a nadie.
//
// Se intento primero soltando el turno cada pocos miles de intentos con un
// setTimeout, y salio mucho peor: con la pestaña en segundo plano el
// navegador estrangula los temporizadores a un segundo cada uno, y una
// busqueda de menos de un segundo pasaba a tardar doce. La medida lo
// enseño de golpe.
//
// Devuelve tambien cuantos intentos costo. No es un adorno: es lo que
// permite medir si la dificultad esta bien puesta en una maquina de
// verdad, que es como se decidio la que hay.
export function resolver(semilla, ceros) {
  const base = new TextEncoder().encode(semilla + ":");
  const bytes = new Uint8Array(64);
  bytes.set(base);

  for (let n = 0; n < 100000000; n++) {
    const texto = String(n);
    let largo = base.length;
    for (let i = 0; i < texto.length; i++) bytes[largo++] = texto.charCodeAt(i);
    if (cerosDelante(resumenDeUnBloque(bytes, largo)) >= ceros) {
      return { nonce: String(n), intentos: n + 1 };
    }
  }
  throw new Error("no se ha encontrado la solucion");
}
