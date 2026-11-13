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

## Historial de aportes por integrante

Movimientos identifica el autor de cada registro, su importe en soles, fecha y meta. Los registros del propio usuario incluyen «(tú)». En la vista general se identifica también el grupo de cada aporte.

El resumen por integrante y grupo suma únicamente aportes vigentes. Los revertidos conservan su autor y monto original en el historial, con la aclaración de que ya no cuentan en el total. «Deshacer» sigue disponible solo para el autor de un movimiento vigente.

Los nombres se consultan con `group_people`, que ya comprueba la pertenencia al grupo. La carga es independiente de las cifras del historial y ocurre solo al abrir Movimientos. No se modifican tablas, políticas ni funciones de Supabase. Si una persona ya no está en el listado de integrantes o no se puede resolver su nombre, se muestra «Integrante no disponible»; no se inventa una identidad ni se expone su correo.

`npm run test:history` comprueba atribución por grupo, totales en céntimos, exclusión de revertidos y duplicados, filtros y permiso de reversión. Junto con las pruebas del jardín, se validan 22 casos automatizados.

En navegador se verificaron dos autores distintos, importes de S/ 100 y S/ 50, un aporte de S/ 10 previamente revertido, filtros de espacio y reversión del aporte propio. Tras deshacer los S/ 100, el resumen quedó en S/ 50 para el otro integrante y los tres registros se conservaron. El gasto privado del segundo usuario no fue visible. A 320 px se observaron 305 px útiles y 305 px de contenido, sin desbordamiento horizontal; la consola no registró errores en esa revisión. Las dos cuentas y todos sus datos temporales se eliminaron al terminar.

## Preguntas por voz al asistente

El botón «Dictar pregunta» inicia el reconocimiento del navegador en español peruano. La transcripción aparece en el mismo campo de la consulta. «Detener dictado» conserva el texto; al terminar se puede editar y pulsar «Consultar al asistente». No se envían resultados parciales automáticamente ni se cambia el servicio de IA.

El micrófono se libera al salir de Asistente, ocultar la pestaña o abrir el registro de movimientos. Los errores de permiso, micrófono, red o ausencia de voz mantienen disponible la escritura y conservan la pregunta. Si el navegador no ofrece reconocimiento, el botón de dictado queda deshabilitado con una explicación.

La aplicación no almacena grabaciones. El reconocimiento lo gestiona el navegador y puede usar un servicio remoto o requerir conexión, según su implementación ([Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)).

`npm run test:voice` comprueba transcripciones sucesivas, conservación de texto, permisos denegados o concedidos tarde, fallos de inicio, cierre de la escucha y el límite de 1500 caracteres. Son pruebas con un reconocedor simulado; no acreditan captación real de audio en todos los navegadores. Con jardín e historial suman 29 casos automatizados.

## Pausar la lectura de una respuesta

Cada respuesta mantiene «Escuchar respuesta». Al pulsarlo aparece únicamente en esa respuesta el control «Pausar»; cuando se pausa cambia a «Reanudar» y continúa la misma lectura. Se oculta al finalizar, ante un error, al cancelar para dictar o al escuchar otra respuesta. Al salir de Asistente se cancela su lectura, incluso si estaba pausada.

El servicio de voz comparte el estado de reproducción para que el control no quede visible cuando otra acción sustituye el audio. `npm run test:playback` valida seis escenarios de inicio, pausa, reanudación, finalización, errores y cancelación. Con las pruebas anteriores suman 35 casos automatizados. Las transiciones se prueban con un sintetizador simulado.
