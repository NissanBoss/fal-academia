
import { manejar } from "../../servidor.js";

export async function onRequest(context) {
  return manejar(context.request, context.env);
}
