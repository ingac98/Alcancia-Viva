# Jardín vivo: revisión visual independiente

Rama: `feat/jardin-vivo-por-metas`.

## Revisar

Con el servidor de desarrollo iniciado, abrir `/design/garden-preview.html`.

- Mi jardín: cuatro macetas de ejemplo; seleccionar una muestra su estado y su plazo.
- Explorar el crecimiento: probar del 0 al 100 % sin guardar información.
- Probar aporte: añade hasta S/ 50 exclusivamente a la meta seleccionada y muestra riego breve.
- Añadir maceta: agrega una meta vacía y recalcula el promedio; los demás montos se conservan.
- Filtros: todas las metas, personales, Familia y Equipo IHC.
- Mis metas: el mismo crecimiento en tarjetas individuales.
- Etapas y elementos: seis fases del cosmos, con botones para examinarlas en el jardín.
- Pausar movimiento y lectura voluntaria del jardín; también se respeta la preferencia de movimiento reducido del dispositivo.

Los datos son ficticios, en memoria, con referencia temporal fija al 11 de noviembre de 2026. Recargar restablece el diseño. Esta página no importa el cliente de Supabase ni llama a APIs. No se modificaron el acceso, la navegación, el registro de movimientos, los grupos, la autenticación ni el service worker de la aplicación principal. En `src/index.css` se excluyen de la detección automática de Tailwind los archivos de esta revisión visual, para que no añadan estilos a la aplicación principal ([documentación oficial](https://tailwindcss.com/docs/detecting-classes-in-source-files#ignoring-specific-paths)).

## Reglas exploradas

- Crecimiento: ahorro / importe objetivo, limitado al intervalo 0–100 %.
- Promedio: media simple de metas visibles únicas; archivadas excluidas y completadas al 100 % hasta archivarlas.
- Ritmo: comparar avance con la proporción del plazo transcurrido. La tolerancia inicial es de 10 puntos porcentuales; es una hipótesis de diseño que debe revisarse con el equipo.
- El paso del tiempo afecta al mensaje y conserva el crecimiento económico. La propuesta actual usa mensajes y color de apoyo; no se ha creado todavía una variante botánica de hojas de menor vitalidad.
- Las flores representan hitos; una planta nunca muere.
- Para evitar confundir un aporte colectivo con ahorro personal, las metas de grupo siempre indican su grupo.

## Recursos visuales

Dos imágenes generadas con la herramienta integrada `image_gen`, convertidas a WebP para entrega web sin quitar el canal alfa del sprite. Los prompts se conservan en `jardin-assets-prompts.json`.

| Archivo | Uso |
| --- | --- |
| `public/design/assets/courtyard.webp` | Patio natural, 1440 × 960, fondo continuo |
| `public/design/assets/cosmos-stages.webp` | Sprite transparente 1536 × 1024, tres columnas por dos filas |

Los estados recorren semilla, brote, planta joven, planta con botones, primeras flores y floración completa. Se separan por recorte CSS la maceta estática y el follaje de movimiento suave. El encuadre de la fila superior se ajusta en CSS para alinear las bases. El fondo cambia sutilmente de saturación con el promedio; las plantas conservan sus estados individuales. Son renders de apariencia tridimensional compuestos en 2.5D, no modelos GLB ni una cámara 3D.

## Validación

Ejecutar `node --test tests/garden-preview.test.mjs` para verificar promedio, duplicados de metas compartidas, límites, plazos, fechas inválidas y aportes aislados. Ejecutar `npm run build` para comprobar la compilación completa.

Validación realizada: 8 pruebas automatizadas aprobadas; compilación TypeScript/Vite correcta. Tras excluir la vista de la detección de Tailwind, los archivos principales conservan los mismos nombres con hash que la versión anterior (`index-DL4l_eiC.css` e `index-DJVIJuVo.js`). En navegador se revisaron selección, aporte aislado, nueva maceta, crecimiento con teclado, filtro de grupo, pausa del movimiento, tarjetas y galería de etapas; sin errores de consola en esa revisión. Se comprobó reflujo a 390 y 320 px sin desbordamiento horizontal. Esto no sustituye una auditoría WCAG ni pruebas con usuarios.

Vista previa separada: https://jardin-vivo--alcancia-viva-jardin.netlify.app/design/garden-preview.html

Esta vista aislada se creó para revisar el aspecto y la interacción antes de integrar los datos de las cuentas. Tras esa revisión, la implementación conectada se incorporó a `main` y a la aplicación principal; esta página conserva la propuesta visual independiente.
