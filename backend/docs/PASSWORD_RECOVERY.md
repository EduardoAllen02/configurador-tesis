# Recuperación de contraseña

`POST /api/auth/forgot-password` recibe `{ email }` y responde siempre 200 con el mismo mensaje, incluso para correos ausentes, entradas inválidas, límites excedidos o fallos del proveedor. Una cola acotada (100 solicitudes pendientes, dos entregas simultáneas) consulta y envía fuera de la respuesta; la espera aleatoria de 300–450 ms no depende del resultado de esa consulta ni de la latencia del correo. Los errores operativos emiten únicamente un aviso fijo sin direcciones, tokens ni detalles del proveedor. No se generan enlaces en respuestas ni logs.

`POST /api/auth/reset-password` recibe `{ token, password }`. Exige ocho caracteres Unicode como mínimo y 72 bytes UTF-8 como máximo; nunca trunca silenciosamente la contraseña de bcrypt. Un enlace inválido, vencido o ya utilizado devuelve 400. El éxito no devuelve sesión: el usuario debe iniciar sesión de nuevo.

Solo después de guardar el cambio, la solicitud ganadora encola un correo de aviso a la cuenta afectada. El aviso identifica Tour Studio e informa del cambio y del cierre de sesiones, sin incluir contraseña, token ni enlaces de recuperación. Las solicitudes repetidas o perdedoras de una carrera no envían avisos. La entrega usa la misma cola acotada de recuperación y es de mejor esfuerzo: un fallo del proveedor o una cola llena genera únicamente el aviso operativo genérico; nunca revierte la contraseña ni convierte un cambio exitoso en error HTTP. Un reinicio puede perder avisos pendientes.

## Configuración de envío

- `PASSWORD_RESET_SECRET`: secreto aleatorio independiente, de al menos 32 bytes; diferente de `JWT_SECRET`. Rotarlo invalida todos los enlaces pendientes. No ponerlo en variables frontend.
- `PUBLIC_APP_URL`: origen HTTPS del frontend, sin ruta, usuario, contraseña, query ni fragmento. Para desarrollo se permite HTTP únicamente en localhost fuera de producción. Jamás se usa el encabezado Host de la solicitud.
- `RESEND_API_KEY`: clave de la cuenta Resend que envía los mensajes, almacenada exclusivamente en el servidor.
- `PASSWORD_RESET_FROM`: remitente autorizado en un dominio verificado por esa misma cuenta Resend. Ejemplo ilustrativo: `Tour Studio <cuentas@dominio-verificado.example>`.
- `PASSWORD_RESET_REPLY_TO`: opcional; dirección en la que recibir respuestas. Puede ser Gmail sin usar Gmail como dominio remitente.

El transporte usa `POST https://api.resend.com/emails` mediante fetch, con timeout de diez segundos y mensaje de texto. No hay credenciales incluidas, SMTP, dependencia nueva ni envío de prueba automático. Configuración ausente o incorrecta impide enviar correo; el endpoint público conserva su respuesta genérica. Antes de publicar debe verificarse operativamente la configuración y la entrega usando un destinatario autorizado.

El enlace es `PUBLIC_APP_URL/reset-password#token=...`. El frontend debe tomar el token del fragmento y quitarlo del historial inmediatamente. Así el secreto no forma parte de la URL enviada al servidor web ni del Referer. No añadir analítica ni recursos externos al formulario de recuperación.

Referencias primarias: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [API de envío Resend](https://resend.com/docs/api-reference/emails/send-email).

## Tokens y sesiones

Los enlaces duran quince minutos: JWT HS256 con secreto separado, propósito y audiencia exclusivos de recuperación, identificador aleatorio de 256 bits y HMAC del hash de contraseña actual. No contienen el hash real. Un cambio de contraseña invalida todos los enlaces previos. Una actualización condicional de `User.passwordHash`, dentro de una transacción, permite que una sola solicitud gane si el enlace se envía simultáneamente. No requiere tablas, migraciones ni semillas.

Las sesiones nuevas incluyen una versión HMAC de la contraseña, firmada con `JWT_SECRET` y un prefijo exclusivo de sesión. El middleware consulta el usuario en cada solicitud autenticada y rechaza versiones obsoletas o usuarios borrados. **Al desplegar este cambio, todos los JWT antiguos sin versión requieren volver a iniciar sesión una sola vez.** Avisar de ese cierre de sesiones al promover la versión. Un token de recuperación nunca autentica una sesión.

## Límites y operación

Los límites de memoria son por proceso: solicitud de correo, diez por IP y tres por correo cada quince minutos; aplicación del cambio, veinte por IP cada quince minutos. Las claves se guardan como HMAC efímeros, sin IP/correo en texto. Cada mapa admite 10 000 entradas; agotado el espacio, rechaza nuevas entradas hasta que caduquen. No hay bloqueo de la cuenta ni cambios de contraseña al solicitar enlaces. Reiniciar el proceso borra límites y cola; un correo pendiente puede perderse y el usuario puede solicitar otro después. Los enlaces ya entregados sobreviven al reinicio.

Para varios procesos/servidores se requiere un limitador y cola compartidos antes de escalar; los límites locales se multiplican por réplica. El despliegue actual no confía en `X-Forwarded-For`; si un proxy inverso agrupa todas las IP, configurar su cadena de confianza expresamente y aplicar límites también en ese proxy, evitando confiar en encabezados arbitrarios.

## Verificación segura

`node --test src/services/passwordReset.test.js` prueba tokens, longitudes, límites, transporte falso, HTTP, carrera de replay e invalidación de sesiones con fixtures en memoria.

`node scripts/qa-password-recovery.cjs RUTA_PRIVADA_DEV_ENV_JSON` prueba las rutas reales por HTTP con Prisma. Rechaza cualquier base excepto el clon local `tour_studio_wave4_20261026`; crea un usuario desechable, reemplaza el transporte por una captura privada en memoria y borra únicamente su fixture en `finally`. No lee `.env` del proyecto original, no aplica migraciones ni envía correos reales. No imprime tokens, contraseñas ni secretos.
