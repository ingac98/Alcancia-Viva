# Supabase: preparación de Alcancía Viva

## Estado

El proyecto **Alcancia Viva** está creado en la organización elegida por el usuario, región São Paulo, con cotización de creación de US$ 0/mes. Referencia: `ahnfwlmymthfgxpyoasz`. Las migraciones están aplicadas y la interfaz React ya utiliza Auth, base de datos y Realtime. La función de Groq está desplegada y respondió en pruebas reales; la clave se guarda solo en los secretos de Supabase.

Se verificaron dos cuentas efímeras, aprobación de ingreso, dos metas, pertenencia a varios grupos, privacidad de gastos, aportes simultáneos (S/ 100 + S/ 50), ausencia de duplicados y dos eventos compartidos recibidos por el otro usuario. La evidencia está en `docs/evidence/collaboration-api.json`.

La configuración de retorno del correo de confirmación fue guardada por el usuario para la dirección del sitio.

## Recuperación de contraseña

En el acceso, «¿Olvidaste tu contraseña?» solicita un enlace mediante `auth.resetPasswordForEmail`. Sin `redirectTo`, Supabase utiliza el Site URL configurado: `https://alcancia-viva-jardin.netlify.app`. Esto también evita enviar enlaces hacia localhost o un dominio de revisión. Para otra instalación se debe actualizar ese ajuste en Supabase.

El evento `PASSWORD_RECOVERY` abre el formulario de nueva contraseña antes del jardín. Se confirma la contraseña (mínimo 8 caracteres) y se valida la sesión con `auth.getUser` antes de llamar a `auth.updateUser`. La recuperación se conserva al recargar en la misma pestaña mediante un marcador de usuario sin tokens ni contraseñas. Un enlace vencido permite solicitar otro; la respuesta de solicitud no revela si existe una cuenta. No se cambian tablas, RLS ni permisos.

`npm run test:recovery` verifica once escenarios de estados, recarga, aislamiento de cuentas, enlaces inválidos, validación y errores mediante dobles de Auth. Un escenario usa el SDK instalado con respuestas HTTP simuladas para verificar `PASSWORD_RECOVERY`, consulta de identidad, actualización y solicitud de correo. Estas pruebas no acreditan entrega de correos: debe comprobarse además con el buzón del usuario. Se comprobó en la API pública del proyecto que el acceso por correo está habilitado. El proveedor de correo y sus límites dependen de la configuración de Supabase; si se usa el servicio predeterminado, revisar sus restricciones de destinatarios y cuotas. Para probar: solicitar el enlace, abrir el correo más reciente, guardar una contraseña distinta, salir e ingresar con ella. No compartir enlaces de recuperación, contraseñas ni capturas de tokens.

Referencias: [recuperación de contraseña](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [actualización del usuario](https://supabase.com/docs/reference/javascript/auth-updateuser).

## Qué incluye

- Perfiles privados con preferencias, categorías aprendidas y fecha de consentimiento.
- Grupos, administradores y miembros; una persona puede pertenecer a varios grupos.
- Invitaciones privadas con vencimiento de siete días y revocación por administrador.
- Solicitudes pendientes, aprobadas o rechazadas; pedir ingreso no crea una membresía.
- Varias metas por grupo y metas individuales. En esta primera versión, el administrador crea las metas compartidas.
- Movimientos separados en gasto, ingreso y ahorro. Cada ahorro requiere una meta existente y autorizada.
- Totales calculados desde los aportes, sin reemplazar el total con una cifra enviada desde un navegador.
- Reintentos con identificador estable y reversión del movimiento por su autor.
- Permisos por usuario/grupo y tablas incorporadas a la publicación Realtime.

Los miembros ven los datos de los aportes compartidos que se registren en su grupo, incluida la descripción del aporte. Los gastos e ingresos personales permanecen privados. Las preferencias solo las ve su dueño.

## Configuración y reproducción

1. Instalar y conectar la integración de Supabase. Seleccionar una organización y crear el proyecto de Alcancía Viva; comprobar el plan antes de aceptar cualquier coste.
2. Aplicar la migración a una base nueva, conservando su historial.
3. Configurar autenticación con correo, las direcciones de acceso y retorno, y la confirmación de correo acorde a la prueba del curso.
4. Configurar en la aplicación la URL y la clave pública del proyecto. Las claves administrativas y de Groq no se incluyen en el cliente.
5. Conectar la interfaz de cuentas, grupos, solicitudes y metas con las operaciones de esta base.
6. Probar dos cuentas reales en sesiones separadas: solicitud, aprobación, aportes y recepción de cambios. Verificar además permisos desde la API, no solo ocultando botones.

La interfaz del repositorio ya utiliza Auth, operaciones de datos y Realtime, y está publicada en Netlify. Para reproducirla con otro backend, preparar todos los servicios indicados y verificar los recorridos con cuentas de prueba. La publicación y la dirección de retorno del correo se documentan en [NETLIFY.md](NETLIFY.md).

## Pruebas realizadas

Entorno aislado: PostgreSQL 17.5, con una sustitución local de `auth.uid()` y tres usuarios ficticios. La sustitución existe únicamente para las pruebas; **no ejecutar `supabase/tests/local-bootstrap.sql` en Supabase**.

Secuencia reproducible en una base local nueva: ejecutar `local-bootstrap.sql`, la migración y `collaboration.sql` con `ON_ERROR_STOP=1`. Después ejecutar `concurrent-alice.sql` y `concurrent-bob.sql` en dos conexiones al mismo tiempo.

Resultados:

- Pasaron las verificaciones de solicitudes repetidas, aislamiento de grupos, acceso pendiente, aprobación/rechazo, bloqueo de autoaprobación, privacidad de gastos y autorización de metas.
- Un aporte repetido con el mismo identificador se guardó una sola vez.
- La reversión redujo el avance de su meta sin cambiar otra meta.
- Se rechazaron monto cero, ahorro sin meta, acceso anónimo y reversión de aporte ajeno.
- Tras un saldo válido de S/ 50, dos conexiones aportaron simultáneamente S/ 100 y S/ 50. El total fue S/ 200 con dos aportes nuevos; la meta Emergencia permaneció en cero.

Los eventos Realtime sobre WebSocket se verificaron con dos clientes autenticados. El envío y la recepción del correo de confirmación y el micrófono físico aún requieren la prueba de los integrantes. No se certifica WCAG ni el porcentaje final de la PC3.

Referencias: [seguridad por fila](https://supabase.com/docs/guides/database/postgres/row-level-security), [funciones de base de datos](https://supabase.com/docs/guides/database/functions), [cambios Realtime](https://supabase.com/docs/guides/realtime/postgres-changes).
