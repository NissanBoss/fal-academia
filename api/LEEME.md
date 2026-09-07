# El servidor de la academia

Guarda las cuentas de los alumnos y por dónde van en el curso. Va en
Cloudflare y no cuesta nada.

## Qué guarda de cada persona

Tres cosas: el nombre que ella misma se ha puesto, algo con lo que comprobar
su contraseña, y su progreso en el curso.

No se pide correo. No se pide nombre real. No se apunta desde dónde entra
nadie ni a qué hora. No hay analítica y los registros de peticiones están
apagados en la configuración.

Eso no es descuido, es el diseño. Un curso de programación no necesita saber
quién eres, y lo que no se guarda no se puede perder, ni filtrar, ni hay que
borrarlo cuando alguien lo pida.

## Por qué esto es Pages y no un Worker

Parece un Worker: es una API y no sirve ninguna página. Va como proyecto de
Pages por el dominio.

Un Worker con nombre propio exige que **fal-lang.org entero** esté gestionado
por Cloudflare, con los nameservers cambiados en Namecheap. Pages se conforma
con un CNAME desde el registrador de siempre, así que `api.fal-lang.org`
funciona sin mover nada de lo que ya está en marcha.

Y que la API cuelgue del mismo dominio que la academia no es estética. La
sesión viaja en una cookie, y las cookies se comparten por dominio: desde un
nombre de otro sitio el navegador la trataría como de terceros y la tiraría,
así que nadie podría entrar y el fallo no diría por qué. Eso pasó de verdad
durante las pruebas, con la página en `localhost` y esto en `127.0.0.1`.

## Cómo se pone en marcha

Hace falta una cuenta de Cloudflare, que es gratis y no pide tarjeta, y
tener Node. En Windows no lo hay, pero dentro de WSL sí.

```bash
npx wrangler login
```

Eso abre el navegador para que autorices. Es el único paso que no se puede
automatizar.

```bash
npx wrangler d1 create fal-academia
```

Devuelve un `database_id`. Hay que pegarlo en `wrangler.toml`, donde ahora
pone `PEGA-AQUI-EL-QUE-TE-DE-WRANGLER`.

```bash
npx wrangler d1 execute fal-academia --remote --file=esquema.sql
```

```bash
npx wrangler pages project create fal-academia-api --production-branch main
```

```bash
npx wrangler pages deploy
```

Y quedan dos cosas a mano:

1. En el panel de Cloudflare, Workers & Pages, el proyecto
   `fal-academia-api`, pestaña **Custom domains**, añadir `api.fal-lang.org`.
2. En Namecheap, Advanced DNS, un registro más:

   | Tipo | Host | Valor |
   |---|---|---|
   | CNAME Record | api | fal-academia-api.pages.dev. |

El orden importa: primero el dominio en Cloudflare y después el CNAME, o el
nombre queda resolviendo a un sitio que todavía no lo reconoce.

## Comprobar que va

```bash
curl https://api.fal-lang.org/api/salud
```

Tiene que contestar `bien`.

## Probarlo en local antes de subir nada

```bash
npx wrangler d1 execute fal-academia --local --file=esquema.sql
npx wrangler pages dev --port 8787
```

La academia detecta sola que está en una máquina de trabajo y habla con ese
servidor en lugar de con el de verdad, así que se puede probar el registro
entero sin tocar nada publicado. Ojo con abrir la academia en `localhost` y
no en `127.0.0.1`: tienen que ser el mismo nombre o la cookie no viaja.

Para pruebas locales hay que poner un `database_id` cualquiera con forma de
UUID en `wrangler.toml`, porque Pages no admite un archivo de configuración
alternativo y lee ese.

## Las pruebas

```bash
node pruebas.mjs
```

Comprueban lo que no se ve al mirar la pantalla: que el estirado que hace el
navegador es exactamente el que espera el servidor, que una contraseña
guardada no se parece a la que llegó, que dos cuentas con la misma
contraseña se guardan distinto, y que los nombres raros no pasan.

La primera de esas es la que importa. El estirado se hace en
`web/cuenta.js` y se comprueba aquí, en dos archivos separados: si un día
alguien cambia el número de vueltas en uno y no en el otro, todo seguirá
funcionando y nadie podrá entrar. La prueba lee los dos archivos y los
compara.

## Por qué la contraseña se estira en el navegador

Es la decisión rara de este servidor y está explicada entera arriba del todo
de `servidor.js`.

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
antes de que haya que mirar la factura.
