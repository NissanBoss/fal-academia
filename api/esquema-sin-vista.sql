-- Fuera la columna "vista" de las sesiones.
--
-- Guardaba la ultima vez que se habia usado cada sesion, y no la leia
-- nadie: la caducidad se mide desde "creada", que es una caducidad dura de
-- 180 dias y no una que se renueve sola. O sea que era un apunte de cuando
-- entra cada persona, guardado para nada.
--
-- En un sitio cuyo argumento entero es que lo que no se guarda no se puede
-- filtrar, una columna asi no es un descuido menor: es justo lo que se ha
-- prometido no hacer.
--
-- POR QUE ESTO VA EN DOS TIEMPOS
--
-- La columna es NOT NULL y sin valor por defecto, asi que el codigo viejo
-- (que la escribe) y el nuevo (que no) no pueden convivir: con ella puesta
-- falla el nuevo, y quitandola de golpe falla el viejo. Cualquiera de los
-- dos ordenes deja un rato sin poder abrir sesion, justo el que tarde el
-- despliegue.
--
-- Asi que primero se le pone un valor por defecto, que hace que los dos
-- codigos funcionen a la vez, y solo despues de desplegar se quita del
-- todo. Las sesiones ya abiertas no se enteran de nada en ningun momento,
-- porque para leerlas solo se miran testigo, alumno y creada.
--
--   1. wrangler d1 execute fal-academia --remote --file=esquema-sin-vista.sql
--   2. wrangler pages deploy
--   3. wrangler d1 execute fal-academia --remote --command \
--        "ALTER TABLE sesiones DROP COLUMN vista"
--
-- SQLite no sabe cambiarle las reglas a una columna, asi que el paso 1 es
-- rehacer la tabla y copiar lo que habia.

CREATE TABLE sesiones_nueva (
  testigo  TEXT PRIMARY KEY,
  alumno   INTEGER NOT NULL,
  creada   INTEGER NOT NULL,
  vista    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (alumno) REFERENCES alumnos(id) ON DELETE CASCADE
);

INSERT INTO sesiones_nueva (testigo, alumno, creada, vista)
  SELECT testigo, alumno, creada, vista FROM sesiones;

DROP TABLE sesiones;
ALTER TABLE sesiones_nueva RENAME TO sesiones;
CREATE INDEX IF NOT EXISTS sesiones_por_alumno ON sesiones(alumno);
