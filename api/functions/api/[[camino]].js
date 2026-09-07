// Todo lo que llegue a /api/loquesea entra por aquí.
//
// Los corchetes dobles del nombre son de Cloudflare Pages: significan que
// este archivo atiende cualquier dirección bajo /api/, con las barras que
// haga falta. El reparto de rutas se hace dentro, en servidor.js, porque un
// archivo por endpoint sería una docena de archivos de tres líneas.

import { manejar } from "../../servidor.js";

export async function onRequest(context) {
  return manejar(context.request, context.env);
}
