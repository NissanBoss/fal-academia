# El servidor de la academia

Guarda las cuentas de los alumnos y por dónde van en el curso. Corre en
Cloudflare Workers y no cuesta nada.

## Qué guarda de cada persona

Tres cosas: el nombre que ella misma se ha puesto, algo con lo que comprobar
su contraseña, y su progreso en el curso.

No se pide correo. No se pide nombre real. No se apunta desde dónde entra
nadie ni a qué hora. No hay analítica y los registros de peticiones están
apagados en la configuración.

Eso no es descuido, es el diseño. Un curso de programación no necesita saber
quién eres, y lo que no se guarda no se puede perder, ni filtrar, ni hay que
borrarlo cuando alguien lo pida.

## Cómo se pone en marcha

Hace falta una cuenta de Cloudflare, que es gratis y no pide tarjeta, y
tener Node instalado.

```bash
npx wrangler login
```

```bash
npx wrangler d1 create fal-academia
```

Ese comando devuelve un `database_id`. Hay que pegarlo en `wrangler.toml`,
donde ahora pone `PEGA-AQUI-EL-QUE-TE-DE-WRANGLER`.

```bash
npx wrangler d1 execute fal-academia --remote --file=esquema.sql
```

```bash
npx wrangler deploy
```

Y por último, en el panel de Cloudflare, en Workers, el worker
`fal-academia`, pestaña Settings, Domains & Routes, añadir el nombre
`api.fal-lang.org`.

**Tiene que ser un subdominio del mismo dominio que la academia.** La sesión
viaja en una cookie, y las cookies se comparten por dominio: desde un nombre
distinto el navegador la trataría como de terceros y la tiraría, así que
nadie podría entrar y el fallo no diría por qué.

## Comprobar que va

```bash
curl https://api.fal-lang.org/api/salud
```

Tiene que contestar `bien`.

## Las pruebas

```bash
node pruebas.mjs
```

Comprueban lo que no se ve al mirar la pantalla: que el estirado que hace el
navegador es exactamente el que espera el servidor, que una contraseña
guardada no se parece a la que llegó, que dos cuentas con la misma
contraseña se guardan distinto, y que los nombres raros no pasan.

La primera de esas es la que importa. El estirado se hace en
`web/cuenta.js` y se comprueba en `worker.js`, dos archivos separados: si un
día alguien cambia el número de vueltas en uno y no en el otro, todo seguirá
funcionando y nadie podrá entrar. La prueba lee los dos archivos y los
compara.

## Por qué la contraseña se estira en el navegador

Es la decisión rara de este servidor y está explicada entera arriba del todo
de `worker.js`.

En corto: el plan gratuito da diez milisegundos de procesador por petición,
y estirar una contraseña como se debe gasta bastante más. Así que el trabajo
caro lo hace el navegador del alumno, que va sobrado, y aquí solo se le pone
encima una sal y un hash rápido.

Quien se llevase esta base de datos seguiría teniendo que pagar las 300.000
vueltas por cada contraseña que quisiera probar, que es justo para lo que
sirve un buen hash. Lo que no se puede hacer nunca es servir esto sin HTTPS.

## Lo que no tiene

- **No hay recuperación por correo**, porque no hay correos. En su lugar, al
  registrarse se da un código de rescate que se enseña una sola vez. Es la
  única forma de volver a entrar si se olvida la contraseña.
- **No hay administración.** Para mirar o arreglar algo se usa
  `npx wrangler d1 execute fal-academia --remote --command "..."`.
- **No hay correo de bienvenida, ni notificaciones, ni nada que se envíe.**

## Los límites del plan gratuito

| | Cuánto da | Qué gasta la academia |
|---|---|---|
| Peticiones | 100.000 al día | unas 4 por alumno y sesión |
| Filas leídas | 5.000.000 al día | 2 por petición |
| Filas escritas | 100.000 al día | 1 cada vez que se guarda el progreso |
| Base de datos | 5 GB | unos 2 KB por alumno |

Con esos números caben del orden de veinte mil alumnos usándolo a diario
antes de que haya que mirar la factura. Si algún día se llega ahí, el plan
de pago son cinco dólares al mes.
