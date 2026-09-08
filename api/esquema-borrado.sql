-- La cuenta sin dueño.
--
-- Cuando alguien borra su cuenta, lo que escribió en el foro no se puede
-- hacer desaparecer sin dejar agujeros en las conversaciones de los demás:
-- un hilo al que le faltan las preguntas son diez respuestas sin sentido.
-- Y borrar la fila de alumnos con mensajes apuntándole falla, porque las
-- claves ajenas están activas.
--
-- La solución es esta fila. El texto de sus mensajes se vacía de verdad, y
-- lo que queda pasa a colgar de aquí.
--
-- El número es el cero, que la numeración automática no reparte nunca:
-- empieza en uno. Y la llave lleva un espacio, que nombreValido() no admite,
-- así que nadie puede registrarse con ella ni hacerse pasar por esto. La
-- contraseña y el rescate no tienen la forma que espera coincide(), de modo
-- que ninguna comprobación puede darlos por buenos.

INSERT OR IGNORE INTO alumnos (id, usuario, llave, clave, rescate, creado)
  VALUES (0, 'cuenta borrada', 'cuenta borrada', 'no se puede entrar aqui',
          'no se puede entrar aqui', 0);
