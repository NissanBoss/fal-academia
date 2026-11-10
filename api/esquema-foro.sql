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
  oculto   INTEGER NOT NULL DEFAULT 0,
  ayudas   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tema) REFERENCES temas(id),
  FOREIGN KEY (autor) REFERENCES alumnos(id)
);

CREATE INDEX IF NOT EXISTS mensajes_por_tema ON mensajes(tema, creado);
CREATE INDEX IF NOT EXISTS mensajes_por_autor ON mensajes(autor, creado DESC);

CREATE TABLE IF NOT EXISTS ayudas (
  mensaje  INTEGER NOT NULL,
  alumno   INTEGER NOT NULL,
  cuando   INTEGER NOT NULL,
  PRIMARY KEY (mensaje, alumno)
);

CREATE TABLE IF NOT EXISTS marcas (
  alumno  INTEGER NOT NULL,
  clave   TEXT NOT NULL,
  ganada  INTEGER NOT NULL,
  PRIMARY KEY (alumno, clave),
  FOREIGN KEY (alumno) REFERENCES alumnos(id)
);

CREATE INDEX IF NOT EXISTS marcas_por_alumno ON marcas(alumno, ganada);

CREATE TABLE IF NOT EXISTS moderadores (
  alumno  INTEGER PRIMARY KEY,
  desde   INTEGER NOT NULL
);

INSERT OR IGNORE INTO categorias (id, clave, nombre, resumen, orden) VALUES
  (1, 'dudas',    'Dudas del curso',
      'Te has atascado en un ejercicio o no entiendes algo del manual.', 1),
  (2, 'muestra',  'Enséñalo',
      'Lo que hayas hecho con Fal, por pequeño que sea.', 2),
  (3, 'lenguaje', 'El lenguaje',
      'Ideas, cosas que echas en falta y discusiones sobre cómo debería ser Fal.', 3),
  (4, 'fallos',   'Algo no va',
      'Cosas que se rompen, en el lenguaje o en esta web.', 4);
