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
