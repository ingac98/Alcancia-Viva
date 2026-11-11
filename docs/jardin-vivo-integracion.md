# Jardín vivo integrado

Rama de trabajo: `feat/jardin-vivo-por-metas`.

Vista de prueba: https://jardin-integrado--alcancia-viva-jardin.netlify.app

La rama `main` y el despliegue de producción se mantienen separados de esta implementación. La vista de prueba usa el mismo proyecto Supabase: los registros de una cuenta son compartidos entre las dos versiones. Las pruebas funcionales se realizan con cuentas temporales autorizadas, sin modificar registros de usuarios existentes.

## Comportamiento

- La vista inicial «Todas mis metas» reúne las metas personales y las metas de grupos a los que la cuenta tiene acceso. Cada ID aparece una vez.
- El selector mantiene las vistas Personal y cada grupo. El promedio siempre corresponde a las metas del espacio elegido, no solo a la página de macetas que se está viendo.
- Cada meta tiene una maceta con seis etapas según el porcentaje ahorrado. El tamaño de la maceta permanece constante y el follaje se mueve suavemente.
- El panel muestra ahorro, objetivo, etapa, fecha y ritmo. Los cálculos son locales y deterministas; no se consulta al LLM para decidir un porcentaje o una etapa.
- «Registrar un aporte» abre el formulario con tipo Ahorro, espacio y meta ya seleccionados. El usuario ingresa el monto y confirma antes de guardar.
- Se conservan las API existentes de registro, reversión y colaboración. Realtime actualiza las macetas y las tarjetas cuando cambia el ahorro del grupo.
- Los recursos también se guardan en la caché de la PWA. Un movimiento pendiente no se presenta como un aporte ya sincronizado.
- Las tarjetas de Metas muestran la misma planta y ofrecen «Ver mi maceta» y «Registrar un aporte».
- Con más de ocho metas, el jardín permite pasar de página. El promedio sigue incluyendo todas las metas del espacio.
- La creación desde la vista general es personal; para una meta compartida se selecciona su grupo. Se mantienen los permisos de administrador existentes.

## Tiempo, dinero y privacidad

El crecimiento usa `current_amount / target_amount`, limitado al intervalo 0–100 %. La cifra ahorrada sigue mostrando el importe registrado, incluso si supera el objetivo.

El ritmo compara ese porcentaje con la proporción del plazo transcurrido desde `created_at` hasta `target_date`. Las fechas se interpretan para Perú. La tolerancia inicial es de diez puntos porcentuales: es una regla de producto ajustable, no una evaluación de la persona. Una demora cambia el mensaje y conserva el crecimiento económico. Si una caché anterior no incluye `created_at`, se muestra un estado neutral.

No se alteran tablas, vistas, funciones, permisos ni políticas RLS. Se utiliza la fecha de creación que ya existe en `goal_progress`. Los gastos privados de otros integrantes no se incorporan al jardín ni al historial.

## Accesibilidad

Cada maceta es un botón nativo con nombre, espacio, porcentaje y etapa. Se puede operar con teclado; el estado seleccionado tiene texto y marco además de color. El jardín ofrece lectura voluntaria y pausa de movimiento, y respeta tanto la preferencia guardada como la del dispositivo. Se adaptan alto contraste, texto grande y mensajes sencillos. También se corrigió el color de los botones de navegación en alto contraste.

## Verificación

- `npm run test:garden`: 16 pruebas de cálculo y selección de destino, validadas con Node 24.22.1.
- `npm run build`: compilación TypeScript y Vite.
- Pruebas de navegador con datos temporales: acceso, filtros personales/grupales, aporte a la meta elegida, nueva maceta, tarjetas, reversión y actualización de otro integrante sin recargar.
- Comprobación de privacidad: la cuenta de prueba ve sus metas y las compartidas; la meta privada del segundo integrante queda fuera.
- Comprobación de accesibilidad: contraste, texto al 200 %, movimiento reducido y reflujo. Estas comprobaciones no sustituyen una auditoría completa de WCAG ni una evaluación con usuarios.

La comprobación final a 320 px dio 305 px útiles de viewport y 305 px de contenido, sin desbordamiento horizontal. Se confirmó que la navegación en alto contraste tiene texto blanco sobre fondo oscuro.

Al terminar se cerró la sesión temporal y se eliminaron las dos cuentas, sus perfiles, sesiones, identidades, metas, aportes y el grupo de prueba. La consulta de verificación devolvió cero usuarios, metas, movimientos y grupos de prueba restantes. No se cambiaron registros de cuentas existentes.

Al validar esta entrega, `main` conserva el commit `4550799af0f738e98b609d2ebdfb1771766fe78a` y producción conserva el despliegue `6af495ab649355510d85cfa9`. La versión integrada se publicó exclusivamente en el alias `jardin-integrado`, despliegue `6af4ca5e797c1d1c7f80f2b5`.

Los recursos visuales y sus instrucciones se documentan en [public/garden/README.md](../public/garden/README.md) y [jardin-assets-prompts.json](jardin-assets-prompts.json).
