CREATE TABLE IF NOT EXISTS alumnos (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario  TEXT NOT NULL,
  llave    TEXT NOT NULL UNIQUE,
  clave    TEXT NOT NULL,
  rescate  TEXT NOT NULL,
  creado   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  testigo  TEXT PRIMARY KEY,
  alumno   INTEGER NOT NULL,
  creada   INTEGER NOT NULL,
  FOREIGN KEY (alumno) REFERENCES alumnos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sesiones_por_alumno ON sesiones(alumno);

CREATE TABLE IF NOT EXISTS progreso (
  alumno   INTEGER PRIMARY KEY,
  datos    TEXT NOT NULL,
  guardado INTEGER NOT NULL,
  FOREIGN KEY (alumno) REFERENCES alumnos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fallos (
  quien    TEXT PRIMARY KEY,
  cuantos  INTEGER NOT NULL,
  hasta    INTEGER NOT NULL
);
