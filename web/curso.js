// El curso entero.
//
// Cada leccion tiene una explicacion, una tarea y la salida exacta que se
// espera del programa del alumno. La solucion esta aqui tambien, y no es
// solo para enseñarsela a quien se atasca: hay una prueba que coge todas
// las soluciones, las pasa por el interprete de verdad y comprueba que dan
// lo que la leccion dice. Un curso con un ejercicio imposible es peor que
// no tener curso, y eso solo se descubre ejecutandolo.
//
// El orden importa: cada leccion solo usa palabras que ya han salido. Si
// mueves una de sitio, comprueba que la de despues sigue teniendo sentido.

export const MODULOS = [
  "Primeros pasos",
  "Decidir y repetir",
  "Listas y diccionarios",
  "Funciones",
  "Objetos",
  "Cuando algo falla",
  "Ya sabes programar",
];

export const LECCIONES = [
  // --- Primeros pasos ----------------------------------------------------
  {
    modulo: 0,
    titulo: "Escribir en pantalla",
    cuerpo: `<p>Para que un programa diga algo se usa <code>escribe</code>, y lo que
      quieres que diga va entre comillas.</p>
      <pre>escribe "Buenos días"</pre>
      <p>Eso es un programa entero. No hace falta nada alrededor: ni abrir nada,
      ni cerrarlo, ni declarar por dónde empieza.</p>`,
    tarea: 'Haz que el programa escriba exactamente <code>Hola mundo</code>.',
    inicial: "",
    espera: "Hola mundo",
    solucion: 'escribe "Hola mundo"',
  },
  {
    modulo: 0,
    titulo: "Guardar un valor",
    cuerpo: `<p>Una variable es una caja con nombre. Se llena con la palabra
      <code>es</code>.</p>
      <pre>ciudad es "Madrid"
escribe ciudad</pre>
      <p>Fíjate en que al escribirla no lleva comillas. Si se las pusieras,
      saldría la palabra <code>ciudad</code> en vez de lo que hay guardado dentro.</p>`,
    tarea: 'Guarda <code>"Sevilla"</code> en una variable llamada <code>ciudad</code> y escríbela.',
    inicial: "",
    espera: "Sevilla",
    solucion: 'ciudad es "Sevilla"\nescribe ciudad',
  },
  {
    modulo: 0,
    titulo: "Juntar textos",
    cuerpo: `<p>La palabra <code>mas</code> une cosas. Vale para sumar números y
      también para pegar textos uno detrás de otro.</p>
      <pre>ciudad es "Madrid"
escribe "Vivo en " mas ciudad</pre>
      <p>Ojo al espacio de dentro de las comillas. Sin él saldría
      <code>Vivo enMadrid</code>, todo pegado.</p>`,
    tarea: 'Guarda <code>"Bilbao"</code> en una variable <code>ciudad</code> y escribe <code>Vivo en Bilbao</code>.',
    inicial: "",
    espera: "Vivo en Bilbao",
    solucion: 'ciudad es "Bilbao"\nescribe "Vivo en " mas ciudad',
  },
  {
    modulo: 0,
    titulo: "Hacer cuentas",
    cuerpo: `<p>Las cuentas se escriben con palabras, igual que se dicen en voz alta.</p>
      <pre>escribe 3 mas 4      # 7
escribe 10 menos 4   # 6
escribe 3 por 4      # 12
escribe 10 entre 2   # 5</pre>
      <p>Lo que va detrás de <code>#</code> es un comentario y el programa lo
      ignora entero. Aquí lo uso para enseñarte lo que sale, pero tú no tienes
      que escribirlo.</p>`,
    tarea: "Escribe el resultado de multiplicar 7 por 6.",
    inicial: "",
    espera: "42",
    debeUsar: ["por"],
    solucion: "escribe 7 por 6",
  },
  {
    modulo: 0,
    titulo: "Preguntar",
    cuerpo: `<p>Un programa puede pedirte algo con <code>pregunta</code>.</p>
      <pre>nombre es pregunta "¿Cómo te llamas?"
escribe "Encantado, " mas nombre</pre>
      <p>Lo que teclee quien use el programa llega siempre como texto. Si vas a
      hacer cuentas con ello, hay que convertirlo con <code>numero de</code>.</p>
      <pre>edad es numero de pregunta "¿Tu edad?"
escribe edad mas 1</pre>
      <p>Aquí en la academia no hay teclado durante el programa, así que las
      respuestas se escriben antes, en el cuadro de abajo. Ya tienes una puesta.</p>`,
    tarea: 'Pregunta el nombre y escribe <code>Hola, Ana</code>. La respuesta ya está preparada abajo.',
    inicial: "",
    entradas: "Ana",
    espera: "¿Cómo te llamas? Hola, Ana",
    solucion: 'nombre es pregunta "¿Cómo te llamas? "\nescribe "Hola, " mas nombre',
    pista: "La pregunta también se escribe en pantalla, así que la salida lleva las dos cosas.",
  },

  // --- Decidir y repetir -------------------------------------------------
  {
    modulo: 1,
    titulo: "Decidir",
    cuerpo: `<p>Con <code>si</code> el programa elige un camino u otro. El bloque
      se cierra siempre con <code>fin</code>.</p>
      <pre>edad es 20
si edad es mayor que 18
    escribe "Puedes pasar"
si no
    escribe "Todavía no"
fin</pre>
      <p>Las comparaciones se leen tal cual: <code>es mayor que</code>,
      <code>es menor que</code>, <code>es igual a</code>,
      <code>es mayor o igual que</code>.</p>`,
    tarea: 'Guarda un <code>8</code> en una variable <code>nota</code>. Escribe <code>Aprobado</code> si llega a 5, y <code>Suspenso</code> si no.',
    inicial: "",
    espera: "Aprobado",
    debeUsar: ["si"],
    solucion: 'nota es 8\nsi nota es mayor o igual que 5\n    escribe "Aprobado"\nsi no\n    escribe "Suspenso"\nfin',
  },
  {
    modulo: 1,
    titulo: "Más de dos caminos",
    cuerpo: `<p>Cuando hay más de dos posibilidades se encadenan con
      <code>si no si</code>.</p>
      <pre>hora es 14
si hora es menor que 12
    escribe "Buenos días"
si no si hora es menor que 21
    escribe "Buenas tardes"
si no
    escribe "Buenas noches"
fin</pre>
      <p>Se va probando de arriba abajo y se queda en el primero que se cumple.
      Por eso el orden importa.</p>`,
    tarea: 'Con <code>nota es 6</code>, escribe <code>Suspenso</code> si es menor que 5, <code>Bien</code> si es menor que 7, y <code>Notable</code> en los demás casos.',
    inicial: "nota es 6\n",
    espera: "Bien",
    solucion: 'nota es 6\nsi nota es menor que 5\n    escribe "Suspenso"\nsi no si nota es menor que 7\n    escribe "Bien"\nsi no\n    escribe "Notable"\nfin',
  },
  {
    modulo: 1,
    titulo: "Repetir",
    cuerpo: `<p>Para hacer algo varias veces está <code>repite</code>.</p>
      <pre>repite 3 veces
    escribe "otra vez"
fin</pre>
      <p>Esto es lo que hace que programar merezca la pena: escribes una línea y
      la máquina la hace mil veces sin quejarse.</p>`,
    tarea: "Escribe <code>Hola</code> tres veces, una en cada línea.",
    inicial: "",
    espera: "Hola\nHola\nHola",
    debeUsar: ["repite"],
    solucion: 'repite 3 veces\n    escribe "Hola"\nfin',
  },
  {
    modulo: 1,
    titulo: "Contar",
    cuerpo: `<p>Cuando necesitas saber por qué vuelta vas, se usa
      <code>para cada</code> con un desde y un hasta.</p>
      <pre>para cada n desde 1 hasta 5
    escribe n
fin</pre>
      <p>Dentro del bucle, <code>n</code> vale 1 la primera vuelta, 2 la segunda,
      y así hasta 5. El nombre lo eliges tú.</p>`,
    tarea: "Escribe los números del 1 al 5, uno en cada línea.",
    inicial: "",
    espera: "1\n2\n3\n4\n5",
    solucion: "para cada n desde 1 hasta 5\n    escribe n\nfin",
  },
  {
    modulo: 1,
    titulo: "Mientras se cumpla",
    cuerpo: `<p><code>mientras</code> repite mientras algo siga siendo cierto. Se
      usa cuando no sabes de antemano cuántas vueltas van a hacer falta.</p>
      <pre>quedan es 3
mientras quedan es mayor que 0
    escribe quedan
    quedan es quedan menos 1
fin
escribe "¡Ya!"</pre>
      <p>Cuidado con una cosa: si dentro del bucle no cambia nada de lo que mira
      la condición, el programa se queda dando vueltas para siempre.</p>`,
    tarea: 'Empieza con <code>cuenta es 3</code> y ve escribiendo y restando hasta llegar a 0. Luego escribe <code>Despegue</code>.',
    inicial: "cuenta es 3\n",
    espera: "3\n2\n1\nDespegue",
    debeUsar: ["mientras"],
    solucion: 'cuenta es 3\nmientras cuenta es mayor que 0\n    escribe cuenta\n    cuenta es cuenta menos 1\nfin\nescribe "Despegue"',
  },

  // --- Listas y diccionarios ---------------------------------------------
  {
    modulo: 2,
    titulo: "Listas",
    cuerpo: `<p>Una lista guarda varias cosas en orden.</p>
      <pre>frutas es lista con "manzana" y "pera" y "uva"

escribe largo de frutas        # 3
escribe elemento 1 de frutas   # manzana
escribe ultimo de frutas       # uva</pre>
      <p>En Fal se cuenta desde el 1, como en la vida. El primero es el 1 y el
      último se puede pedir con <code>elemento menos 1</code>.</p>`,
    tarea: 'Haz una lista <code>colores</code> con rojo, verde y azul. Escribe cuántos hay y después el segundo.',
    inicial: "",
    espera: "3\nverde",
    solucion: 'colores es lista con "rojo" y "verde" y "azul"\nescribe largo de colores\nescribe elemento 2 de colores',
  },
  {
    modulo: 2,
    titulo: "Recorrer una lista",
    cuerpo: `<p><code>para cada</code> también recorre una lista entera, sin que
      tengas que contar nada.</p>
      <pre>frutas es lista con "manzana" y "pera"
para cada f en frutas
    escribe "Me gusta la " mas f
fin</pre>
      <p>Da igual que la lista tenga tres cosas o tres mil: el programa es el
      mismo.</p>`,
    tarea: 'Con la lista <code>numeros</code> que ya está puesta, escribe el doble de cada uno, uno por línea.',
    inicial: "numeros es lista con 2 y 5 y 10\n",
    espera: "4\n10\n20",
    solucion: "numeros es lista con 2 y 5 y 10\npara cada n en numeros\n    escribe n por 2\nfin",
  },
  {
    modulo: 2,
    titulo: "Cambiar una lista",
    cuerpo: `<p>Las listas no son de piedra.</p>
      <pre>compra es lista vacia
agrega "pan" a compra
agrega "leche" a compra
elemento 1 de compra es "pan integral"
quita 2 de compra</pre>
      <p><code>quita</code> lleva la posición, no la cosa. <code>quita 2</code>
      saca el segundo de la lista.</p>`,
    tarea: 'Empieza con una lista vacía llamada <code>compra</code>, agrega <code>"pan"</code> y luego <code>"leche"</code>, y escribe la lista entera.',
    inicial: "",
    espera: "[pan, leche]",
    debeUsar: ["agrega"],
    solucion: 'compra es lista vacia\nagrega "pan" a compra\nagrega "leche" a compra\nescribe compra',
  },
  {
    modulo: 2,
    titulo: "Herramientas para listas",
    cuerpo: `<p>Fal ya trae hechas las cosas que se hacen siempre.</p>
      <pre>notas es lista con 7 y 4 y 9

escribe suma de notas        # 20
escribe promedio de notas    # 6.666666666666667
escribe ordena de notas      # [4, 7, 9]
escribe maximo de notas      # 9</pre>
      <p>Todas se llaman igual: el nombre, <code>de</code>, y el dato. Esa es una
      de las ocho reglas del lenguaje y no tiene excepciones.</p>`,
    tarea: 'Con la lista <code>notas</code> que hay puesta, escribe primero la suma y después la lista ordenada.',
    inicial: "notas es lista con 7 y 4 y 9\n",
    espera: "20\n[4, 7, 9]",
    solucion: "notas es lista con 7 y 4 y 9\nescribe suma de notas\nescribe ordena de notas",
  },
  {
    modulo: 2,
    titulo: "Diccionarios",
    cuerpo: `<p>Un diccionario guarda parejas: a cada nombre le corresponde un
      valor. Sirve cuando el orden da igual pero quieres buscar por nombre.</p>
      <pre>edades es diccionario vacio
elemento "ana" de edades es 25
elemento "luis" de edades es 30

escribe elemento "ana" de edades   # 25
escribe claves de edades           # [ana, luis]</pre>
      <p>Es como una agenda: no te importa en qué página está Ana, te importa
      poder buscarla por su nombre.</p>`,
    tarea: 'Haz un diccionario <code>precios</code> vacío, pon que el pan vale 1 y la leche 2, y escribe el precio del pan.',
    inicial: "",
    espera: "1",
    solucion: 'precios es diccionario vacio\nelemento "pan" de precios es 1\nelemento "leche" de precios es 2\nescribe elemento "pan" de precios',
  },

  // --- Funciones ---------------------------------------------------------
  {
    modulo: 3,
    titulo: "Tu primera función",
    cuerpo: `<p>Una función es un trozo de programa al que le pones nombre para
      poder usarlo cuantas veces quieras.</p>
      <pre>funcion saluda con nombre
    devuelve "Hola " mas nombre
fin

escribe saluda con "Ana"</pre>
      <p><code>devuelve</code> es lo que la función entrega a quien la llamó. Sin
      <code>devuelve</code>, la función hace cosas pero no entrega nada.</p>`,
    tarea: 'Haz una función <code>doble</code> que reciba un número y devuelva el doble. Escribe el doble de 21.',
    inicial: "",
    espera: "42",
    debeUsar: ["funcion", "devuelve"],
    solucion: "funcion doble con n\n    devuelve n por 2\nfin\nescribe doble con 21",
  },
  {
    modulo: 3,
    titulo: "Varios datos",
    cuerpo: `<p>Una función puede recibir varias cosas, separadas con
      <code>y</code>.</p>
      <pre>funcion suma con a y b
    devuelve a mas b
fin

escribe suma con 3 y 4      # 7</pre>
      <p>Y se puede llamar de las dos formas, que significan exactamente lo mismo:
      <code>suma con 3 y 4</code> o <code>suma de 3 con 4</code>.</p>`,
    tarea: 'Haz una función <code>area</code> que reciba base y altura y devuelva el área de un rectángulo. Escribe el área de uno de 4 por 5.',
    inicial: "",
    espera: "20",
    solucion: "funcion area con base y altura\n    devuelve base por altura\nfin\nescribe area con 4 y 5",
  },
  {
    modulo: 3,
    titulo: "Una función dentro de otra",
    cuerpo: `<p>Una función puede llamar a otra, y a sí misma. Esto último se
      llama recursión y es la forma corta de resolver algunas cosas.</p>
      <pre>funcion factorial con n
    si n es menor o igual que 1
        devuelve 1
    fin
    devuelve n por (factorial con (n menos 1))
fin

escribe factorial con 5     # 120</pre>
      <p>Lo importante es el <code>si</code> de arriba. Sin él la función se
      llamaría a sí misma para siempre.</p>`,
    tarea: "Escribe el factorial de 6 usando esa función.",
    inicial: "",
    espera: "720",
    solucion: "funcion factorial con n\n    si n es menor o igual que 1\n        devuelve 1\n    fin\n    devuelve n por (factorial con (n menos 1))\nfin\nescribe factorial con 6",
  },
  {
    modulo: 3,
    titulo: "Las funciones son datos",
    cuerpo: `<p>Una función se puede guardar en una variable y pasarla como
      cualquier otro dato.</p>
      <pre>funcion triple con n
    devuelve n por 3
fin

f es funcion triple
escribe f con 5           # 15</pre>
      <p>Hace falta escribir <code>funcion triple</code> y no solo
      <code>triple</code>, porque un nombre suelto significa "llámala". Con
      <code>funcion</code> delante pides la función en sí.</p>`,
    tarea: 'Guarda la función <code>mayusculas</code> en una variable llamada <code>grita</code> y úsala con <code>"hola"</code>.',
    inicial: "",
    espera: "HOLA",
    solucion: 'grita es funcion mayusculas\nescribe grita con "hola"',
  },

  // --- Objetos -----------------------------------------------------------
  {
    modulo: 4,
    titulo: "Tipos",
    cuerpo: `<p>Un tipo es un molde. Dice qué datos lleva una cosa y qué sabe
      hacer.</p>
      <pre>tipo Perro con nombre y edad
    funcion ladra
        devuelve nombre de mi mas " dice guau"
    fin
fin

toby es nuevo Perro con "Toby" y 3
escribe ladra de toby</pre>
      <p>Dentro del tipo, <code>mi</code> es el propio objeto. <code>nombre de
      mi</code> es el nombre de este perro concreto, no el de otro.</p>`,
    tarea: 'Haz un tipo <code>Gato</code> con un campo <code>nombre</code> y una función <code>maulla</code> que devuelva el nombre seguido de <code> dice miau</code>. Crea uno que se llame Lola y escribe lo que dice.',
    inicial: "",
    espera: "Lola dice miau",
    debeUsar: ["tipo", "nuevo"],
    solucion: 'tipo Gato con nombre\n    funcion maulla\n        devuelve nombre de mi mas " dice miau"\n    fin\nfin\nlola es nuevo Gato con "Lola"\nescribe maulla de lola',
  },
  {
    modulo: 4,
    titulo: "Leer y cambiar campos",
    cuerpo: `<p>Los campos de un objeto se leen y se cambian igual que todo lo
      demás.</p>
      <pre>tipo Cuenta con titular y saldo
fin

c es nuevo Cuenta con "Ana" y 100
escribe saldo de c          # 100
saldo de c es 150
escribe saldo de c          # 150</pre>
      <p>Un tipo puede no tener ninguna función. A veces solo quieres guardar
      varias cosas juntas con un nombre.</p>`,
    tarea: 'Crea una <code>Cuenta</code> de Ana con 100, súmale 50 al saldo y escribe el saldo.',
    inicial: "tipo Cuenta con titular y saldo\nfin\n",
    espera: "150",
    solucion: 'tipo Cuenta con titular y saldo\nfin\nc es nuevo Cuenta con "Ana" y 100\nsaldo de c es saldo de c mas 50\nescribe saldo de c',
  },
  {
    modulo: 4,
    titulo: "Funciones que cambian el objeto",
    modifica: true,
    cuerpo: `<p>Lo normal es que sea el propio objeto el que sepa cambiarse, en
      vez de que lo toque cualquiera desde fuera.</p>
      <pre>tipo Cuenta con titular y saldo
    funcion ingresa con cantidad
        saldo de mi es saldo de mi mas cantidad
    fin
fin

c es nuevo Cuenta con "Ana" y 100
ingresa de c con 50
escribe saldo de c          # 150</pre>`,
    tarea: 'Añade al tipo una función <code>saca</code> que reste. Ingresa 50 y saca 30 de una cuenta que empieza con 100, y escribe el saldo.',
    inicial: "tipo Cuenta con titular y saldo\n    funcion ingresa con cantidad\n        saldo de mi es saldo de mi mas cantidad\n    fin\nfin\n",
    espera: "120",
    solucion: 'tipo Cuenta con titular y saldo\n    funcion ingresa con cantidad\n        saldo de mi es saldo de mi mas cantidad\n    fin\n    funcion saca con cantidad\n        saldo de mi es saldo de mi menos cantidad\n    fin\nfin\nc es nuevo Cuenta con "Ana" y 100\ningresa de c con 50\nsaca de c con 30\nescribe saldo de c',
  },
  {
    modulo: 4,
    titulo: "Heredar",
    cuerpo: `<p>Un tipo puede partir de otro y quedarse con todo lo suyo.</p>
      <pre>tipo Animal con nombre
    funcion habla
        devuelve "..."
    fin
    funcion presenta
        devuelve nombre de mi mas " dice " mas habla de mi
    fin
fin

tipo Perro hereda de Animal
    funcion habla
        devuelve "guau"
    fin
fin

escribe presenta de (nuevo Perro con "Toby")</pre>
      <p>Aquí está la gracia: <code>presenta</code> se escribió una sola vez, en
      <code>Animal</code>, y sin embargo llama al <code>habla</code> del perro.
      Cada animal contesta lo suyo sin tocar la función que los presenta.</p>`,
    tarea: 'Añade un tipo <code>Gato</code> que herede de <code>Animal</code> y diga <code>miau</code>. Presenta a uno llamado Lola.',
    inicial: 'tipo Animal con nombre\n    funcion habla\n        devuelve "..."\n    fin\n    funcion presenta\n        devuelve nombre de mi mas " dice " mas habla de mi\n    fin\nfin\n',
    espera: "Lola dice miau",
    debeUsar: ["hereda"],
    solucion: 'tipo Animal con nombre\n    funcion habla\n        devuelve "..."\n    fin\n    funcion presenta\n        devuelve nombre de mi mas " dice " mas habla de mi\n    fin\nfin\ntipo Gato hereda de Animal\n    funcion habla\n        devuelve "miau"\n    fin\nfin\nescribe presenta de (nuevo Gato con "Lola")',
  },

  // --- Cuando algo falla -------------------------------------------------
  {
    modulo: 5,
    titulo: "Los errores hablan",
    modifica: true,
    cuerpo: `<p>Cuando algo va mal, Fal no suelta un número ni una palabra en
      inglés. Dice qué pasó, en qué línea, y cómo se arregla.</p>
      <pre>escribe 1 entre 0</pre>
      <p>Prueba a ejecutarlo tal cual antes de hacer la tarea y lee lo que sale.
      Ese mensaje está escrito para que sirva de algo, no para el que hizo el
      lenguaje.</p>`,
    tarea: 'Escribe un programa que provoque un error a propósito dividiendo entre cero, y luego arréglalo para que escriba <code>5</code>.',
    inicial: "escribe 10 entre 0\n",
    espera: "5",
    solucion: "escribe 10 entre 2",
    pista: "Cambia el 0 por un número que dé 5 al dividir 10.",
  },
  {
    modulo: 5,
    titulo: "Cazar un error",
    cuerpo: `<p>Con <code>intenta</code> el programa sigue vivo aunque algo falle.</p>
      <pre>intenta
    escribe 1 entre 0
si falla de matematica
    escribe "No se puede dividir entre cero"
fin</pre>
      <p>Hay nueve clases de error: <code>matematica</code>, <code>valor</code>,
      <code>tipo</code>, <code>nombre</code>, <code>archivo</code>,
      <code>red</code>, <code>programa</code>, <code>sintaxis</code> y
      <code>limite</code>. Con <code>si falla</code> a secas se cazan todos.</p>`,
    tarea: 'Intenta dividir 5 entre 0 y, si falla, escribe <code>Casi</code>. Luego escribe <code>Sigo aquí</code> fuera del bloque.',
    inicial: "",
    espera: "Casi\nSigo aquí",
    debeUsar: ["intenta"],
    solucion: 'intenta\n    escribe 5 entre 0\nsi falla\n    escribe "Casi"\nfin\nescribe "Sigo aquí"',
  },
  {
    modulo: 5,
    titulo: "Provocar un error tú",
    cuerpo: `<p>A veces el error lo tienes que dar tú, porque solo tú sabes que
      algo no tiene sentido.</p>
      <pre>funcion raiz_cuadrada con n
    si n es menor que 0
        falla "no hay raíz de un número negativo"
    fin
    devuelve raiz de n
fin</pre>
      <p>Eso es mejor que devolver un cero disimulando: quien te llamó se entera
      de que algo iba mal en vez de seguir con un dato falso.</p>`,
    tarea: 'Haz una función <code>edad_valida</code> que falle si le pasan un número negativo, y cázala con <code>intenta</code> pasándole <code>menos 5</code>. Escribe <code>Eso no es una edad</code>.',
    inicial: "",
    espera: "Eso no es una edad",
    debeUsar: ["falla"],
    solucion: 'funcion edad_valida con n\n    si n es menor que 0\n        falla "edad negativa"\n    fin\n    devuelve n\nfin\nintenta\n    escribe edad_valida con (menos 5)\nsi falla\n    escribe "Eso no es una edad"\nfin',
  },

  // --- Ya sabes programar ------------------------------------------------
  {
    modulo: 6,
    titulo: "Trabajar con listas de golpe",
    cuerpo: `<p>Cuando quieres hacerle lo mismo a toda una lista, no hace falta
      escribir el bucle.</p>
      <pre>numeros es lista con 1 y 2 y 3 y 4

escribe mapa con numeros y funcion doble      # cada uno por su doble
escribe filtra con numeros y funcion es_par   # solo los que pasan
escribe cuenta_si con numeros y funcion es_par</pre>
      <p>Estas tres reciben una función como dato, que es lo que aprendiste hace
      dos módulos. Aquí se ve para qué servía.</p>`,
    tarea: 'Haz una función <code>es_par</code> que diga si un número es par (usa <code>resto</code>, que va entre los dos números: <code>n resto 2</code> da 0 si es par) y filtra la lista que hay puesta.',
    inicial: "numeros es lista con 1 y 2 y 3 y 4 y 5 y 6\n",
    espera: "[2, 4, 6]",
    debeUsar: ["filtra"],
    solucion: "numeros es lista con 1 y 2 y 3 y 4 y 5 y 6\nfuncion es_par con n\n    devuelve n resto 2 es 0\nfin\nescribe filtra con numeros y funcion es_par",
  },
  {
    modulo: 6,
    titulo: "Textos",
    cuerpo: `<p>Los textos traen muchas herramientas hechas.</p>
      <pre>escribe mayusculas de "hola"              # HOLA
escribe largo de "hola"                   # 4
escribe parte de "a,b,c" con ","          # [a, b, c]
escribe une de lista con " - "
escribe reemplaza de "hola mundo" con "mundo" y "Ana"
escribe trozo de "abcdefg" con 2 y 4      # bcd</pre>`,
    tarea: 'Parte la frase que hay puesta por las comas y escribe cuántos trozos salen y luego el segundo.',
    inicial: 'frase es "pan,leche,huevos"\n',
    espera: "3\nleche",
    solucion: 'frase es "pan,leche,huevos"\ntrozos es parte de frase con ","\nescribe largo de trozos\nescribe elemento 2 de trozos',
  },
  {
    modulo: 6,
    titulo: "Funciones que recuerdan",
    cuerpo: `<p>Una función puede acordarse de dónde nació. Esto se llama
      clausura y es de las cosas más potentes que hay.</p>
      <pre>funcion contador_desde con inicio
    cuenta es inicio
    devuelve funcion
        comparte cuenta
        cuenta es cuenta mas 1
        devuelve cuenta
    fin
fin

siguiente es contador_desde con 100
escribe siguiente      # 101
escribe siguiente      # 102</pre>
      <p><code>comparte</code> es lo que dice que esa variable es la de fuera y
      no una nueva. Sin esa palabra, cada llamada empezaría de cero.</p>`,
    tarea: "Haz un contador que empiece en 10 y escribe sus tres primeros valores.",
    inicial: "",
    espera: "11\n12\n13",
    debeUsar: ["comparte"],
    solucion: "funcion contador_desde con inicio\n    cuenta es inicio\n    devuelve funcion\n        comparte cuenta\n        cuenta es cuenta mas 1\n        devuelve cuenta\n    fin\nfin\nsiguiente es contador_desde con 10\nescribe siguiente\nescribe siguiente\nescribe siguiente",
  },
  {
    modulo: 6,
    titulo: "Dibujar",
    cuerpo: `<p>Hay una tortuga que arrastra un lápiz por la pantalla. Empieza en
      el centro mirando hacia arriba.</p>
      <pre>repite 4 veces
    camina de 50
    gira de 90
fin</pre>
      <p>Eso es un cuadrado. <code>camina</code> avanza dejando raya y
      <code>gira</code> tuerce a la derecha esos grados. Para ir hacia atrás o
      girar a la izquierda se usa un número negativo entre paréntesis:
      <code>gira de (menos 90)</code>.</p>
      <p>El dibujo aparece debajo de la salida cuando ejecutas.</p>`,
    tarea: "Dibuja un triángulo: tres lados de 60 pasos girando 120 grados cada vez.",
    inicial: "",
    espera: "",
    debeUsar: ["camina", "gira"],
    dibuja: true,
    solucion: "repite 3 veces\n    camina de 60\n    gira de 120\nfin",
  },
  {
    modulo: 6,
    titulo: "Una estrella",
    cuerpo: `<p>Cambiando un número, el mismo bucle de antes dibuja cosas muy
      distintas. Prueba a tocar los números y ejecutar otra vez.</p>
      <pre>repite 36 veces
    camina de 100
    gira de 170
fin</pre>
      <p>Cuatro líneas y sale una estrella de treinta y seis puntas. Esto es lo
      que quería decir lo del principio: escribes poco y la máquina hace mucho.</p>`,
    tarea: "Dibuja una estrella de cinco puntas: cinco lados de 100 girando 144 grados.",
    inicial: "",
    espera: "",
    debeUsar: ["repite", "camina"],
    dibuja: true,
    solucion: "repite 5 veces\n    camina de 100\n    gira de 144\nfin",
  },
  {
    modulo: 6,
    titulo: "El proyecto final",
    cuerpo: `<p>Ya tienes todo lo que hace falta para un programa de verdad: datos
      guardados, decisiones, bucles, funciones y objetos.</p>
      <p>Este ejercicio junta varias cosas a la vez. Tómate tu tiempo, y si te
      atascas mira la solución, que para eso está.</p>
      <p>A partir de aquí, lo que sigue es el <a href="https://github.com/NissanBoss/Fal/blob/main/MANUAL.md">manual</a>,
      donde están las 93 funciones, los archivos, el JSON, las fechas y todo lo
      demás. Y la tabla del final traduce cada cosa a Python y a JavaScript,
      porque Fal está pensado para dejarlo atrás.</p>`,
    tarea: 'Con la lista de notas que hay puesta: escribe la nota media redondeada a 2 decimales, y luego <code>Aprobado</code> o <code>Suspenso</code> según llegue a 5.',
    inicial: "notas es lista con 7 y 4 y 9 y 6\n",
    espera: "6.5\nAprobado",
    solucion: 'notas es lista con 7 y 4 y 9 y 6\nmedia es redondea con (promedio de notas) y 2\nescribe media\nsi media es mayor o igual que 5\n    escribe "Aprobado"\nsi no\n    escribe "Suspenso"\nfin',
  },
];
