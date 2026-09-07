# La academia de Fal

El curso que hay en **aprende.fal-lang.org**. Treinta y dos lecciones con
ejercicios que se corrigen solos, desde escribir en pantalla hasta clausuras.

## Qué hay aquí

| | |
|---|---|
| `web/curso.js` | Las lecciones. Es el archivo que se toca para añadir o cambiar contenido. |
| `web/index.html` | La academia entera: índice, lección, editor y corrección. |
| `web/cuenta.js` | El registro y la entrada, por el lado del navegador. |
| `web/comprobar-curso.mjs` | Pasa todas las soluciones por el intérprete de verdad. |
| `api/` | El servidor de cuentas, en Cloudflare Pages. Tiene su propio LEEME. |

El intérprete no está aquí. Se saca del repositorio de Fal en cada
publicación y se compila a WebAssembly, así que la academia siempre enseña
el lenguaje que hay ahora mismo.

## Añadir una lección

Se añade una entrada más a `web/curso.js`:

```js
{
  modulo: 2,                       // el número dentro de MODULOS
  titulo: "Ordenar una lista",
  cuerpo: `<p>La explicación, en HTML.</p>`,
  tarea: "Lo que tiene que conseguir el alumno.",
  inicial: "notas es lista con 7 y 4\n",   // lo que ya está escrito
  espera: "[4, 7]",                        // la salida exacta
  solucion: "notas es lista con 7 y 4\nescribe ordena de notas",
  debeUsar: ["ordena"],            // opcional: palabras obligatorias
  pista: "...",                    // opcional: ayuda al fallar
}
```

Y después, **siempre**:

```bash
cd web && node comprobar-curso.mjs
```

Eso ejecuta las 32 soluciones con el intérprete y comprueba que cada una da
lo que su lección promete. Es la diferencia entre un curso y una lista de
buenas intenciones: un ejercicio cuya solución no funciona deja tirado al
alumno justo cuando confía en el sitio. También lo comprueba el flujo de
publicación, así que un curso roto no llega a publicarse.

Hace falta el intérprete compilado para Linux:

```bash
cd ../fal && go build -o ../fal-academia/api/fal-linux .
```

## El orden importa

Cada lección solo usa palabras que ya han salido antes. Si mueves una de
sitio, comprueba que la siguiente sigue teniendo sentido: `filtra` no se
entiende sin haber visto que una función se puede guardar en una variable, y
eso está tres módulos antes.

## Qué pasa si el servidor de cuentas está caído

Nada. El progreso se guarda siempre en el navegador, y la cuenta solo sirve
para llevárselo a otro aparato. Si la academia no puede hablar con el
servidor, el botón sigue diciendo «Guardar progreso» y el curso funciona
igual. Eso es a propósito: nadie debería quedarse sin poder estudiar porque
un servidor tenga un mal día.

## Ponerlo en marcha

1. Subir este repositorio a GitHub.
2. Settings, Pages, Source, GitHub Actions.
3. En el DNS de `fal-lang.org`, un CNAME de `aprende` a `NissanBoss.github.io`.
4. Settings, Pages, Custom domain, `aprende.fal-lang.org`.
5. El servidor de cuentas va aparte y está explicado en `api/LEEME.md`.

El paso 5 puede esperar. Sin él, la academia funciona entera salvo el botón
de guardar el progreso en una cuenta.
