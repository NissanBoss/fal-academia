
import { resolver } from "./trabajo.js";

onmessage = (aviso) => {
  const { semilla, ceros } = aviso.data;
  try {
    postMessage({ ...resolver(semilla, ceros, (van) => postMessage({ van })) });
  } catch (fallo) {
    postMessage({ error: String(fallo && fallo.message ? fallo.message : fallo) });
  }
};
