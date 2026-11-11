# Instalación y primer uso

1. Instalar Node.js 22 o posterior y ejecutar `npm ci` en la carpeta del proyecto.
2. Ejecutar `npm run dev` y abrir la dirección que indique la terminal. La configuración pública de Supabase ya está incluida; para otro proyecto se puede sustituir con las variables de `.env.example`.
3. Crear una cuenta con correo y contraseña, confirmar el correo e iniciar sesión. Completar el nombre y el consentimiento del perfil.
4. Crear una meta personal o crear un grupo. Cada grupo permite varias metas.
5. Para invitar, compartir el código o enlace; el otro usuario solicita ingreso y el administrador lo aprueba desde Mis grupos.
6. Registrar un ahorro indicando la meta. Los gastos e ingresos se registran con su categoría y permanecen privados.

Las cuentas nuevas empiezan vacías. Las evidencias de validación utilizan cuentas efímeras identificadas como QA; no son perfiles reales y se retiran al finalizar.

## Publicación

`npm run build` crea `dist`. La configuración de Netlify está en `netlify.toml`. Véase [publicación desde GitHub](NETLIFY.md). El correo de confirmación debe volver al dominio publicado, configurado como Site URL en Supabase.

Groq usa `GROQ_API_KEY` en los secretos de la función de Supabase, nunca en el código del navegador. La voz necesita permiso del micrófono; siempre se puede escribir. La instalación PWA y la voz se prueban desde HTTPS o localhost.

## Trabajo sin conexión

Se requiere haber abierto la versión de producción y tener una sesión previa. La app puede conservar un registro pendiente para enviarlo al recuperar conexión. Los cambios compartidos y las consultas de IA necesitan internet. Hay que verificar este recorrido con los dispositivos de los integrantes antes de presentarlo como evidencia de la entrega.
