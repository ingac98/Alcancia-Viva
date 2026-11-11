# Publicación en Netlify desde GitHub

El frontend se publica en Netlify. Supabase conserva las cuentas, permisos, metas, movimientos y el asistente Groq; no hay que crear otra base de datos.

## Estado publicado — 11 de noviembre de 2026

- Aplicación: <https://alcancia-viva-jardin.netlify.app>.
- Código: <https://github.com/ingac98/Alcancia-Viva>.
- Panel: <https://app.netlify.com/projects/alcancia-viva-jardin>.
- Proyecto de Netlify: `2d6b257c-cdff-46f9-ba95-5852aab7a7d4`, equipo `ingac98`, plan Free.
- Publicación: `6af412b8c96fa7632280437f`, estado `ready`, fuente `0766edc2c40425c044f6bfd79c47daa9d278efb1`.
- Site URL de Supabase: el propietario confirmó el cambio a la dirección de Netlify. La integración usada no permite leer ni modificar ese ajuste.

Este despliegue se realizó con la herramienta oficial de Netlify desde una copia limpia del código publicado en GitHub. No se activó la publicación automática desde GitHub; los pasos siguientes explican cómo enlazarla si se desea. Para actualizar manualmente: compilar y ejecutar `netlify deploy --prod --dir dist --no-build` desde este proyecto, con la cuenta autorizada y el proyecto enlazado.

## Enlazar publicación automática

1. Subir este código a un repositorio de GitHub accesible por el equipo.
2. En Netlify elegir **Add new project → Import an existing project → GitHub** y seleccionar el repositorio y su rama de publicación.
3. Dejar la carpeta base en la raíz del proyecto. `netlify.toml` fija Node 22, `npm run build`, la carpeta `dist`, la redirección de rutas y la actualización del service worker.
4. Para este proyecto la URL y clave publicable de Supabase ya tienen valores públicos predeterminados en `src/live/client.ts`. Opcionalmente se pueden definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en Netlify para otro proyecto. Nunca poner `GROQ_API_KEY` ni una clave `service_role` en variables `VITE_*`.
5. Al obtener la URL definitiva `https://<nombre>.netlify.app`, establecerla como **Site URL** en [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/ahnfwlmymthfgxpyoasz/auth/url-configuration). Añadir esa misma dirección a Redirect URLs si se usan redirecciones explícitas. No habilitar comodines para dominios de terceros.
6. Verificar desde otro equipo: registro y confirmación de correo, ingreso, creación de meta, invitación a un grupo con aprobación y actualización de un aporte. Los usuarios existentes conservan su cuenta; deben volver a iniciar sesión en el nuevo dominio.
7. Compartir el enlace de Netlify y generar de nuevo las invitaciones desde ese dominio. El almacenamiento local y los registros pendientes no se transfieren entre dominios: sincronizarlos antes de abandonar el anterior.

Los cambios posteriores de la rama enlazada disparan una nueva publicación. La función `financial-assistant` se despliega aparte en Supabase cuando cambia su código; Netlify solo aloja el frontend.

Para publicación manual alternativa, ejecutar `npm ci` y `npm run build` y cargar únicamente el contenido de `dist`. No subir `.env.local`, `node_modules` ni archivos de acceso de pruebas. La importación desde GitHub es la opción preparada para este proyecto.

Referencia: [Vite en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).
