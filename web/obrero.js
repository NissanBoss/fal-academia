// El hilo aparte que resuelve la prueba de trabajo.
//
// La busqueda tarda cerca de un segundo y es un bucle apretado que no
// suelta el turno. Hecha dentro de la pagina, la congela: no se mueve el
// raton, no se pinta el mensaje que dice que se esta comprobando algo, y
// parece que la web se ha roto justo cuando alguien esta intentando
// registrarse.
//
// Aqui dentro da igual. Es el mismo reparto que usa el interprete de Fal
// en la academia: lo que tarda, tarda en otro hilo.

import { resolver } from "./trabajo.js";

onmessage = (aviso) => {
  const { semilla, ceros } = aviso.data;
  try {
    postMessage({ ...resolver(semilla, ceros, (van) => postMessage({ van })) });
  } catch (fallo) {
    postMessage({ error: String(fallo && fallo.message ? fallo.message : fallo) });
  }
};
