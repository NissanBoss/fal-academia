-- El foro, y las marcas que se ganan en el curso.
--
-- Va sobre la misma base de datos que la academia a propósito. Un foro
-- aparte no podría saber que alguien ha terminado el curso, y eso es
-- justamente lo que se quiere enseñar en su perfil.
--
-- Aplicar con:
--   npx wrangler d1 execute fal-academia --remote --file=esquema-foro.sql

-- Las categorías no las crean los usuarios. Un foro pequeño con categorías
-- libres acaba con cuarenta secciones vacías y ninguna conversación.
CREATE TABLE IF NOT EXISTS categorias (
  id        INTEGER PRIMARY KEY,
  clave     TEXT NOT NULL UNIQUE,
  nombre    TEXT NOT NULL,
  resumen   TEXT NOT NULL,
  orden     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS temas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria  INTEGER NOT NULL,
  autor      INTEGER NOT NULL,
  titulo     TEXT NOT NULL,
  creado     INTEGER NOT NULL,
  -- Se guarda cuándo se habló por última vez en vez de calcularlo cada vez
  -- que se pinta la portada: ordenar por eso es lo que más se hace, y con
  -- el tope diario de filas leídas del plan gratuito conviene no recorrer
  -- todos los mensajes para averiguarlo.
  movido     INTEGER NOT NULL,
  mensajes   INTEGER NOT NULL DEFAULT 0,
  cerrado    INTEGER NOT NULL DEFAULT 0,
  oculto     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (categoria) REFERENCES categorias(id),
  FOREIGN KEY (autor) REFERENCES alumnos(id)
);

CREATE INDEX IF NOT EXISTS temas_por_movido ON temas(oculto, movido DESC);
CREATE INDEX IF NOT EXISTS temas_por_categoria ON temas(categoria, oculto, movido DESC);
CREATE INDEX IF NOT EXISTS temas_por_autor ON temas(autor, creado DESC);

CREATE TABLE IF NOT EXISTS mensajes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  tema     INTEGER NOT NULL,
  autor    INTEGER NOT NULL,
  cuerpo   TEXT NOT NULL,
  creado   INTEGER NOT NULL,
  editado  INTEGER,
  -- Un mensaje borrado se marca en vez de desaparecer, para que un hilo no
  -- quede lleno de respuestas a algo que ya no está.
  oculto   INTEGER NOT NULL DEFAULT 0,
  ayudas   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tema) REFERENCES temas(id),
  FOREIGN KEY (autor) REFERENCES alumnos(id)
);

CREATE INDEX IF NOT EXISTS mensajes_por_tema ON mensajes(tema, creado);
CREATE INDEX IF NOT EXISTS mensajes_por_autor ON mensajes(autor, creado DESC);

-- Quién ha dicho que una respuesta le ayudó. La pareja es la clave para que
-- nadie pueda marcar dos veces lo mismo.
CREATE TABLE IF NOT EXISTS ayudas (
  mensaje  INTEGER NOT NULL,
  alumno   INTEGER NOT NULL,
  cuando   INTEGER NOT NULL,
  PRIMARY KEY (mensaje, alumno)
);

-- Las marcas ganadas. Se guardan al ganarlas en vez de calcularlas al
-- pintar un perfil: una marca es un momento, y la fecha en que se consiguió
-- es la mitad de la gracia.
CREATE TABLE IF NOT EXISTS marcas (
  alumno  INTEGER NOT NULL,
  clave   TEXT NOT NULL,
  ganada  INTEGER NOT NULL,
  PRIMARY KEY (alumno, clave),
  FOREIGN KEY (alumno) REFERENCES alumnos(id)
);

CREATE INDEX IF NOT EXISTS marcas_por_alumno ON marcas(alumno, ganada);

-- Quién puede moderar. Se guarda en una tabla en lugar de a fuego en el
-- código para poder añadir a alguien sin volver a desplegar.
CREATE TABLE IF NOT EXISTS moderadores (
  alumno  INTEGER PRIMARY KEY,
  desde   INTEGER NOT NULL
);

-- Las categorías de salida. Pocas y con un nombre que diga qué va dentro.
INSERT OR IGNORE INTO categorias (id, clave, nombre, resumen, orden) VALUES
  (1, 'dudas',    'Dudas del curso',
      'Te has atascado en un ejercicio o no entiendes algo del manual.', 1),
  (2, 'muestra',  'Enséñalo',
      'Lo que hayas hecho con Fal, por pequeño que sea.', 2),
  (3, 'lenguaje', 'El lenguaje',
      'Ideas, cosas que echas en falta y discusiones sobre cómo debería ser Fal.', 3),
  (4, 'fallos',   'Algo no va',
      'Cosas que se rompen, en el lenguaje o en esta web.', 4);
