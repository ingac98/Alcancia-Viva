# Alcancía Viva

Educación financiera con un jardín realista, registro por voz o texto y metas compartidas. Proyecto CC451 de Interacción Humano Computadora, UNI. Datos de práctica; no conecta bancos ni mueve dinero real.

## Versión colaborativa

La entrada principal utiliza `src/live/CollaborativeApp.tsx`. Esta carpeta contiene la versión colaborativa preparada para publicar desde GitHub en Netlify.

Esta versión incorpora cuentas de Supabase, varios grupos por persona, varias metas por grupo, ingreso por código/enlace con aprobación del administrador y aportes asociados a una meta concreta. Los totales se calculan desde movimientos, con reintentos que no duplican y reversión por el autor. Los gastos personales no son visibles para otros miembros.

El asistente llama a Groq desde una función de Supabase; las claves de IA no se incluyen en el navegador. Usa soles peruanos (PEN, S/), valida las respuestas y rechaza interpretaciones en otra moneda sin convertir importes. La entrada de voz usa el reconocimiento del navegador, con transcripción y alternativa escrita. Los controles son nativos, el registro usa un diálogo con foco, y hay preferencias de contraste, movimiento y texto grande.

## Ejecutar

Requiere Node.js 22 o posterior.

```powershell
npm ci
Copy-Item .env.example .env.local
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

La URL y la clave publicable del proyecto ya están configuradas como valores predeterminados; las variables permiten cambiarlas. La clave privada de Groq permanece en Supabase. La primera cuenta requiere registro, confirmación por correo e ingreso. Después se pide consentimiento para guardar el perfil.

Proyecto configurado: [panel de Alcancia Viva](https://supabase.com/dashboard/project/ahnfwlmymthfgxpyoasz).

```powershell
npm run build
npm run preview
```

La PWA registra el service worker en producción. El uso sin conexión requiere una primera carga con conexión y una sesión previa; los nuevos movimientos quedan pendientes por usuario en el dispositivo hasta sincronizar. Las consultas a IA y las aprobaciones necesitan internet.

## Configuración de Supabase

Las migraciones se encuentran en `supabase/migrations/`. Ya se aplicaron al proyecto enlazado. No repetirlas manualmente sobre la misma base. Las pruebas con reemplazo de Auth en `supabase/tests/local-bootstrap.sql` son SOLO para una base local desechable, nunca para Supabase.

La función `financial-assistant` valida la sesión de Auth antes de procesar consultas. Necesita el secreto `GROQ_API_KEY` en el servidor. Los cálculos y autorizaciones se resuelven fuera del LLM. Véase [preparación y verificación](docs/SUPABASE.md).

## Pruebas

```powershell
node scripts/verify-domain.mjs
node scripts/verify-assistant.mjs
```

`verify-collaboration.mjs` utiliza exclusivamente cuentas de prueba efímeras creadas para la validación, no las credenciales de un usuario. No es una herramienta para crear cuentas reales. La evidencia del resultado queda en `docs/evidence/collaboration-api.json`; los datos de acceso de prueba no están en el repositorio.

Se verificaron autenticación real, aprobación, aislamiento de gastos, múltiples grupos y metas, aportes simultáneos, reintentos, recepción de eventos Realtime y llamadas a Groq. Las imágenes del jardín y sus prompts se documentan en [public/garden/README.md](public/garden/README.md).

## Alcance y pendientes

Esta es una primera implementación funcional, no una certificación del 70 % ni de WCAG. La voz debe probarse con micrófono real, y faltan auditoría axe, pruebas con lectores de pantalla y usuarios, validación completa sin conexión y mediciones de rendimiento. También quedan el historial evolutivo avanzado, eliminación de cuenta, reglas más completas del jardín y las ampliaciones SCAMPER que se decida incluir.

El despliegue en Netlify se configura con `netlify.toml`; el procedimiento y la actualización del enlace de confirmación de correo están en [docs/NETLIFY.md](docs/NETLIFY.md). No se considera completada la migración hasta verificar el dominio definitivo y el acceso de usuarios.

## Equipo y licencia

Farid Alonzo Villanueva Alzamora, Hector Espinoza Benavente, Jorly Inga Chavez y Jean Paul Mori Malca. Licencia MIT; véase LICENSE.
