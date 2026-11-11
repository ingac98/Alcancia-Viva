# Jardín de Alcancía Viva

Recursos creados con la herramienta integrada de generación de imágenes para este proyecto. No requieren una API de imágenes en la aplicación.

- `floreciente.png`: fotografía generada de un jardín verde con sendero de piedra y flores rosadas, blancas y amarillas, luz de mañana y texturas naturales. Sin texto, logos ni interfaz.
- `crecimiento.png`: edición de la misma escena, cámara y luz; flores sustituidas por brotes y capullos con algunas flores pequeñas. El jardín conserva vitalidad, sin castigo visual.

Prompt inicial: "Create a landscape photograph of a small beautiful realistic garden seen from eye level, with a gently curving pale stone path through a modest lush flower bed, ferns and natural green foliage, flowering pink cosmos, white daisies and small yellow flowers. Early morning sunlight, dewdrops, authentic leaf textures, calm welcoming mood, premium botanical photography, believable horticulture, no people. Composition fits a mobile card cropped from landscape. No text, no numbers, no currency, no UI, no logos, no watermark."

Prompt de edición: "Preserve exactly the camera angle, stone path, tree, background wall, light and garden layout. Change only flowering plants: replace abundant open flowers with young green plants and mostly closed buds, a few small flowers beginning to open. The garden remains cared for, healthy, realistic, welcoming, never dead or punished."

Las imágenes anteriores se conservan para la bienvenida y la referencia visual original.

## Macetas dinámicas

- `courtyard.webp`: patio natural de 1440 × 960 píxeles, con el suelo despejado para colocar macetas.
- `cosmos-stages.webp`: sprite transparente de 1536 × 1024 píxeles, en tres columnas y dos filas. Incluye semilla, brote, planta joven, planta con botones, primeras flores y floración completa.

Estos recursos se generaron con la herramienta integrada de imágenes y se optimizaron a WebP conservando el canal alfa. Se muestran como capas con apariencia tridimensional, sin modelos 3D navegables. [Prompts de generación y ajuste](../../docs/jardin-assets-prompts.json).

Cada meta tiene una maceta de tamaño constante: solo crece el follaje. Las seis etapas dependen del porcentaje ahorrado (0 %, 1–24 %, 25–49 %, 50–74 %, 75–99 %, 100 %). El promedio general da el mismo peso a cada meta visible y no duplica metas compartidas. La fecha orienta el mensaje; una demora no mata la planta ni borra el ahorro. La reversión de un aporte recalcula el avance.
