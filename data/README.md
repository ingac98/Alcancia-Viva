# Datos simulados y escenarios de demostración

[mock_data.json](mock_data.json) contiene datos completamente ficticios de Alcancía Viva. Su propósito es ofrecer ejemplos reproducibles de registro, categorías, metas, privacidad y colaboración en soles peruanos.

## Qué contiene

| Elemento | Contenido |
| --- | --- |
| Periodo | 13 de octubre a 11 de noviembre de 2026: 30 días |
| Personas ficticias | Ana y Bruno |
| Grupos | Familia Semilla y Equipo de estudio |
| Metas personales de Ana | Laptop y Fondo de emergencia |
| Metas de Familia Semilla | Viaje a Cusco y Emergencia familiar |
| Metas de Equipo de estudio | Materiales y Feria estudiantil |
| Movimientos | 4 ingresos, 30 gastos y 8 aportes de ahorro |
| Moneda | PEN; los importes se muestran como S/ |

Los identificadores son alias de referencia. No son UUID de Supabase, cuentas de Auth, contraseñas ni códigos de invitación válidos. La aplicación no carga el archivo automáticamente ni ofrece un botón de importación del JSON.

## Cómo usar los ejemplos

1. Dos integrantes crean cuentas propias de prueba, confirman su correo e ingresan desde navegadores o dispositivos distintos.
2. La primera cuenta representa a Ana: crea las metas personales **Laptop** por S/ 2000 y **Fondo de emergencia** por S/ 1000.
3. Esa cuenta crea **Familia Semilla** e invita a la segunda mediante el código generado por la aplicación. Antes de aprobar la solicitud, comprobar que la segunda cuenta todavía no accede a los datos del grupo.
4. El administrador aprueba la solicitud y crea las metas **Viaje a Cusco** por S/ 2000 y **Emergencia familiar** por S/ 1000.
5. La segunda cuenta representa a Bruno: crea **Equipo de estudio**, invita y aprueba a la primera cuenta y crea **Materiales** por S/ 400 y **Feria estudiantil** por S/ 600.
6. Cada participante registra los movimientos de su alias, respetando tipo, monto, categoría, fecha y meta. Elegir **Personal** o el grupo correspondiente antes de comprobar su progreso.

Si se recrea todo el conjunto, introducir cada registro una sola vez en cuentas de prueba vacías. Se pueden revisar ejemplos individuales sin cargar los 42 movimientos; en ese caso, los totales serán los de los registros efectivamente ingresados. Cada cuenta decide su nombre visible; los alias del archivo solo identifican los papeles del recorrido.

## Recorrido breve de colaboración

Con las metas anteriores creadas, este subconjunto permite demostrar el destino del ahorro y la actualización compartida:

| Cuenta | Registro | Meta que se debe confirmar | Resultado esperado |
| --- | --- | --- | --- |
| Ana | Ahorré S/ 100 | Viaje a Cusco, de Familia Semilla | La meta acumula S/ 100 |
| Bruno | Ahorré S/ 50 | Viaje a Cusco, del mismo grupo | Ambos ven S/ 150 |
| Ana | Gasté S/ 15 en almuerzo | Sin meta; categoría Alimentación | Bruno no ve el gasto personal |
| Ana | Ahorré S/ 100 | Selección pendiente | No se guarda hasta elegir una meta |

El aporte de S/ 100 sin destino es un caso de prevención de errores; cancelar su registro después de comprobar la solicitud de meta. No añadirlo al dataset completo.

Para comprobar la reversión, revertir el aporte propio de Bruno de S/ 50: el total de Viaje a Cusco pasa a S/ 100. Este es un escenario alternativo; los resultados de la tabla siguiente corresponden al archivo completo sin reversiones.

## Resultados del conjunto completo

| Meta | Ahorro registrado | Objetivo |
| --- | --- | --- |
| Laptop | S/ 300 | S/ 2000 |
| Fondo de emergencia | S/ 100 | S/ 1000 |
| Viaje a Cusco | S/ 150 | S/ 2000 |
| Emergencia familiar | S/ 100 | S/ 1000 |
| Materiales | S/ 300 | S/ 400 |
| Feria estudiantil | S/ 200 | S/ 600 |

Totales por tipo: **S/ 3500 de ingresos**, **S/ 495 de gastos** y **S/ 1150 de aportes de ahorro**. Los aportes pueden provenir de ingresos ya registrados: estos totales no representan cantidades de dinero independientes ni un saldo bancario calculado.

El jardín de **Equipo de estudio** alcanza el 50 % conjunto —S/ 500 de S/ 1000— y muestra florecimiento. **Familia Semilla** acumula S/ 250 de S/ 3000 y muestra crecimiento. Los resultados verificables se incluyen en `expected_results`; la app calcula sus propios totales desde los movimientos guardados, sin importar esas cifras como saldos.

## Estructura del JSON

| Clave | Significado |
| --- | --- |
| `metadata` | Periodo, moneda, zona horaria y carácter ficticio del conjunto |
| `profiles` | Alias y preferencias ilustrativas; no crea cuentas reales |
| `groups` y `memberships` | Grupos, participantes y roles al terminar el recorrido de aprobación |
| `goals` | Metas personales o compartidas y sus objetivos |
| `movements` | Registros de tipo `income`, `expense` o `savings` |
| `expected_results` | Sumas y estados del jardín para comparar con la ejecución manual |

Las fechas son ejemplos fijos del periodo indicado. El presupuesto semanal de la aplicación utiliza la semana actual de Lima; no hay que confundirlo con los gastos de los 30 días del archivo. No se requiere alterar la base compartida ni aplicar SQL para usar estos ejemplos.
