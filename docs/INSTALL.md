# Guía de instalación y primer uso

## Requisitos

- Git.
- Node.js 22.18 o posterior con npm.
- Navegador actualizado. La voz requiere soporte de Web Speech API y permiso de micrófono.
- Internet para registro, inicio de sesión, datos compartidos y consultas al asistente.

## 1. Clonar y preparar

```bash
git clone https://github.com/ingac98/Alcancia-Viva.git
cd Alcancia-Viva
npm ci
```

La instalación utiliza las versiones del archivo `package-lock.json`.

## 2. Configurar el proyecto

### Usar el backend compartido del equipo

El frontend incluye la URL y la clave publicable del proyecto de Supabase como valores predeterminados en `src/live/client.ts`. Se puede ejecutar con esa configuración. Los permisos y la sesión controlan el acceso a los datos.

### Usar otro proyecto de Supabase

Copiar `.env.example` a `.env.local`:

**PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

**Linux o macOS:**

```bash
cp .env.example .env.local
```

Completar:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable
```

El proyecto nuevo necesita el esquema y las operaciones de `supabase/migrations/`, Auth por correo, Realtime y la función `financial-assistant`. Aplicar las migraciones en orden a una base nueva; no repetirlas sobre el proyecto del equipo ya configurado. Consultar [SUPABASE.md](SUPABASE.md).

Guardar `GROQ_API_KEY` como secreto de la función en Supabase. Las variables `VITE_*` se incluyen en el navegador: solo deben contener configuración pública.

## 3. Ejecutar localmente

```bash
npm run dev
```

Abrir la dirección indicada en la terminal, normalmente `http://localhost:5173`. Si el puerto está ocupado, Vite indica otro.

## 4. Crear una cuenta y probar el registro

1. Seleccionar **Quiero crear una cuenta**.
2. Introducir nombre, correo y contraseña y aceptar el tratamiento de los datos de práctica.
3. Confirmar el correo y volver a la aplicación para ingresar.
4. Crear una meta personal, como **Laptop**.
5. Registrar un gasto o ingreso con su categoría.
6. Registrar un ahorro, revisar la propuesta y seleccionar la meta a la que se suma.

Las cuentas nuevas empiezan vacías. Los ejemplos incluidos están en [data/mock_data.json](../data/mock_data.json); la [guía de demostración](../data/README.md) explica cómo recrearlos. No se cargan automáticamente en las cuentas.

## 5. Probar la colaboración

1. La primera cuenta crea un grupo desde **Mis grupos**.
2. Comparte su código o enlace con la segunda persona, que inicia sesión en otro navegador o dispositivo.
3. La segunda cuenta solicita acceso. El administrador revisa y aprueba la solicitud.
4. El administrador crea varias metas dentro del grupo.
5. Cada miembro registra un aporte seleccionando una meta compartida.
6. Comprobar la actualización en ambos dispositivos y que los gastos personales no se compartan.

Una persona puede pertenecer a varios grupos. Cambiar **Tu espacio** para consultar las metas personales o las de un grupo específico.

## 6. Probar voz y accesibilidad

- Permitir el micrófono cuando se decida usar el dictado; revisar la transcripción antes de guardar.
- Usar la alternativa escrita si el navegador no ofrece reconocimiento de voz.
- Probar los botones de lectura del jardín y las respuestas del asistente.
- Revisar en **Preferencias** el contraste, texto grande, audio y reducción de movimiento.
- Recorrer los controles con teclado y comprobar los mensajes de estado con el lector de pantalla del dispositivo.

## 7. Compilar y comprobar la PWA

```bash
npm run build
npm run preview
```

`dist/` contiene la versión publicable. Abrir la URL indicada por la vista previa.

El service worker se registra en producción. En el sitio HTTPS, usar la opción de instalación del navegador cuando esté disponible. Para probar reconexión, cargar primero con internet, iniciar sesión y después desconectar temporalmente el dispositivo. Los registros pendientes pertenecen a esa cuenta y dispositivo; al reconectar, comprobar su sincronización.

Los cambios compartidos y las consultas de IA necesitan internet. El uso completo sin conexión y la instalación deben verificarse en los dispositivos de los integrantes.

## 8. Publicar en Netlify

La aplicación está disponible en [alcancia-viva-jardin.netlify.app](https://alcancia-viva-jardin.netlify.app). `netlify.toml` define el comando de compilación, la carpeta `dist`, las rutas y los encabezados del service worker.

Al publicar con otra dirección, configurar **Site URL** en Supabase Auth para que el correo de confirmación regrese a ella. La configuración actual y los pasos para enlazar GitHub están en [NETLIFY.md](NETLIFY.md). El despliegue actual se actualiza manualmente.

## 9. Resolver problemas habituales

| Situación | Qué revisar |
| --- | --- |
| No llega el correo de confirmación | Correo ingresado, carpeta de spam y límites/configuración de envío de Supabase Auth |
| El correo vuelve a otra dirección | Site URL y las redirecciones permitidas en Supabase |
| No se puede ingresar | Confirmación del correo, credenciales y disponibilidad de la conexión |
| No aparece el grupo | Sesión correcta y aprobación de la solicitud por su administrador |
| El ahorro no se guarda | Importe positivo y selección de una meta autorizada |
| No está disponible el dictado | Compatibilidad del navegador, permiso de micrófono y contexto HTTPS o localhost |
| El asistente no responde | Conexión, sesión y secreto `GROQ_API_KEY` en la función |
| Los ejemplos del JSON no aparecen | Son referencias de demostración; introducirlos mediante la interfaz |
