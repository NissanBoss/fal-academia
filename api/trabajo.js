// La prueba de trabajo, por el lado del servidor.
//
// No es un captcha de los de adivinar letras torcidas. Aquellos intentan
// distinguir a una persona de un programa, y hace años que los programas
// los leen mejor que nosotros; ademas dejan fuera a quien no ve bien. Esto
// hace otra cosa: le cobra un poco de CPU a cada cuenta nueva.
//
// A una persona le cuesta medio segundo una sola vez en la vida. A quien
// quiera crear cuentas en cadena le cuesta ese medio segundo por cada una,
// multiplicado por las que quiera. Y comprobarlo aqui es un solo resumen,
// asi que el servidor no paga nada.
//
// Conviene ser honesto con lo que esto es: un peaje, no un muro. Quien
// tenga una maquina buena y ganas puede pagarlo. Lo que impide de verdad
// una avalancha es el tope de cuentas por hora; esto es lo que hace que no
// salga gratis intentarlo.

// Cuantos ceros por delante se piden. Cada cero de mas dobla el trabajo.
//
// Los numeros salen de medirlo, no de estimarlo, y la medida sorprende: el
// navegador hace unos 390.000 resumenes por segundo, seis veces menos que
// Node con el mismo codigo. Con veinte ceros la media salia en CUATRO
// segundos, y en un movil viejo serian quince. Inaceptable para algo que
// hay que hacer para entrar en una web.
//
// Dieciocho son unos 262.000 intentos: cerca de un segundo en un ordenador
// normal y dos o tres en un telefono lento, una sola vez en la vida. Al
// entrar se piden dieciseis, porque ahi lo paga alguien que se ha
// equivocado de contraseña y no tiene la culpa de nada.
export const CEROS_REGISTRO = 18;
export const CEROS_ENTRAR = 16;

// La semilla lleva dentro una ventana de tiempo para que una solucion no
// valga eternamente. Cinco minutos, y se admite tambien la anterior, asi
// que hay entre cinco y diez para resolverla: de sobra para el medio
// segundo que cuesta, y poco para guardarse un almacen de soluciones
// hechas.
const VENTANA = 5 * 60 * 1000;

export function ventanaAhora() {
  return Math.floor(Date.now() / VENTANA);
}

// Al registrarse, la semilla es el nombre que se quiere. Como un nombre
// solo se puede registrar una vez, reutilizar una solucion no sirve de
// nada: la segunda vez el nombre ya esta cogido.
export function semillaDeRegistro(usuario, ventana) {
  return "registro:" + usuario.toLowerCase() + ":" + ventana;
}

// Al entrar, la semilla lleva ademas cuantos fallos van. Ese numero sube
// con cada intento fallido, asi que la solucion de un intento no vale para
// el siguiente y hay que volver a pagar por cada contraseña que se pruebe.
export function semillaDeEntrada(usuario, ventana, fallos) {
  return "entrar:" + usuario.toLowerCase() + ":" + ventana + ":" + fallos;
}

function cerosDelante(bytes) {
  let ceros = 0;
  for (const b of bytes) {
    if (b !== 0) return ceros + Math.clz32(b) - 24;
    ceros += 8;
  }
  return ceros;
}

// Comprueba una solucion. Vale la ventana de ahora y la anterior, para que
// a nadie se le caduque mientras la esta calculando.
export async function trabajoHecho(hacerSemilla, nonce, ceros) {
  if (typeof nonce !== "string" || !/^[0-9]{1,12}$/.test(nonce)) return false;
  const ahora = ventanaAhora();
  for (const ventana of [ahora, ahora - 1]) {
    const texto = hacerSemilla(ventana) + ":" + nonce;
    const resumen = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto))
    );
    if (cerosDelante(resumen) >= ceros) return true;
  }
  return false;
}
