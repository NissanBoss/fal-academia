-- Las tablas de la academia.
--
-- Se guarda lo minimo que hace falta para que alguien pueda seguir el curso
-- desde otro aparato: un nombre que el mismo elige, con que comprobar su
-- contraseña, y por donde va. No hay correo, ni nombre real, ni nada que
-- diga quien es la persona que hay detras del nombre.
--
-- Aplicar con:
--   npx wrangler d1 execute fal-academia --remote --file=esquema.sql

CREATE TABLE IF NOT EXISTS alumnos (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  -- El nombre se guarda dos veces: como lo escribio el alumno, para
  -- enseñarselo, y en minusculas, para que "Ana" y "ana" no sean dos
  -- cuentas distintas y para buscarlo sin depender de mayusculas.
  usuario  TEXT NOT NULL,
  llave    TEXT NOT NULL UNIQUE,
  clave    TEXT NOT NULL,
  rescate  TEXT NOT NULL,
  creado   INTEGER NOT NULL
);

-- Se guarda el hash del testigo de sesion, no el testigo. Si alguien se
-- lleva esta tabla no se lleva ninguna sesion utilizable, igual que pasa
-- con las contraseñas.
CREATE TABLE IF NOT EXISTS sesiones (
  testigo  TEXT PRIMARY KEY,
  alumno   INTEGER NOT NULL,
  creada   INTEGER NOT NULL,
  FOREIGN KEY (alumno) REFERENCES alumnos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sesiones_por_alumno ON sesiones(alumno);

-- El progreso entero cabe en un JSON pequeño: que lecciones estan hechas,
-- en cual va, y lo que lleva escrito en cada ejercicio. Guardarlo como un
-- solo campo evita una fila por leccion y mantiene el gasto diario muy por
-- debajo de lo que el plan gratuito permite.
CREATE TABLE IF NOT EXISTS progreso (
  alumno   INTEGER PRIMARY KEY,
  datos    TEXT NOT NULL,
  guardado INTEGER NOT NULL,
  FOREIGN KEY (alumno) REFERENCES alumnos(id) ON DELETE CASCADE
);

-- Los fallos de entrada, para que nadie pueda probar contraseñas a mansalva.
-- Se cuenta por nombre de usuario y tambien por procedencia, porque cada uno
-- para un ataque distinto: probar mil contraseñas contra una cuenta, o la
-- misma contraseña contra mil cuentas.
CREATE TABLE IF NOT EXISTS fallos (
  quien    TEXT PRIMARY KEY,
  cuantos  INTEGER NOT NULL,
  hasta    INTEGER NOT NULL
);
