# Instalar en el celular

Hay dos formas de usar el sistema en el teléfono:

1. **PWA**: se instala desde el navegador y se agrega a la pantalla de inicio.
2. **APK Android**: se copia e instala como una aplicación normal.

En ambos casos la información sigue viviendo en el servidor (base de datos y fotografías). El teléfono necesita conexión con la computadora o servidor donde corre Laravel.

## Opción 1: PWA (aplicación web instalable)

La PWA ya está configurada en Angular:

- `public/manifest.webmanifest`
- `public/icons/*`
- `ngsw-config.json`
- Service worker de Angular
- Botón **Instalar app** en el menú lateral

### Requisitos

- La aplicación debe abrirse por **HTTPS** (o `localhost`).
- Debe ser una compilación de producción (`npm run build`), no `npm start` en desarrollo.
- El servidor de la API debe ser accesible desde el teléfono.

### Instalar en Android (Chrome)

1. Abre la URL del sistema en Chrome.
2. Toca el menú de tres puntos.
3. Elige **Instalar aplicación** o **Agregar a pantalla de inicio**.
4. También puedes usar el botón **Instalar app** del menú lateral.

### Instalar en iPhone (Safari)

1. Abre la URL en Safari.
2. Toca el botón **Compartir**.
3. Elige **Agregar a pantalla de inicio**.

### Importante

- Chrome muestra el aviso de instalación cuando se cumplen los requisitos (HTTPS, manifest, service worker e íconos). Ya se verificó que el manifest y el service worker son válidos.
- El service worker guarda la interfaz para que cargue más rápido, pero **no guarda datos privados de clientes ni fotografías** para uso offline.
- Si la app se abre con un nombre de host distinto al de producción, la API debe estar configurada correctamente en `frontend/src/environments/environment.ts`.

## Opción 2: APK Android

El proyecto ya incluye la plataforma Android con Capacitor.

### APK generado

Existe un APK listo para instalar:

```text
C:\MisProyectos\Optica\apk\Optica-debug.apk
```

Fue compilado con la URL de API:

```text
http://192.168.101.85:8000/api
```

Ese APK funciona mientras:

- La computadora conserve esa dirección IP.
- El servidor Laravel esté encendido y escuchando en `0.0.0.0:8000`.
- El teléfono esté en la misma red Wi-Fi.
- El firewall de Windows permita conexiones entrantes al puerto 8000.

### Instalar el APK

1. Copia `Optica-debug.apk` al teléfono por USB, correo, WhatsApp o almacenamiento.
2. Abre el archivo desde el teléfono.
3. Android pedirá permitir la instalación de aplicaciones desconocidas. Actívalo para el explorador o la app con la que lo abriste.
4. Instala y abre **Óptica**.
5. Inicia sesión con `ana` o `luis`.

### Si cambia la IP de la computadora

Vuelve a generar el APK indicando la nueva dirección:

```powershell
cd C:\MisProyectos\Optica
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -ApiUrl "http://192.168.1.50:8000/api"
```

El script:

- Compila Angular en modo producción.
- Copia los archivos al proyecto Android.
- Genera el APK de depuración.
- Lo deja en `apk\Optica-debug.apk`.
- Restaura `public/app-config.js` para no afectar la versión web.

Para generar una versión de release (sin firmar):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 `
  -ApiUrl "https://api.optica.ejemplo.com/api" `
  -Release
```

El APK de release debe firmarse en Android Studio antes de distribuirlo. El APK de depuración sirve para uso interno directo.

### Requisitos para compilar

- Node.js 22+.
- **JDK 17** (el script lo detecta en `C:\Program Files\Java\jdk-17`).
- Android SDK con plataformas 34 y Build Tools 34. En este equipo:

```text
C:\Users\Usuario\AppData\Local\Android\Sdk
```

- Android Studio no es obligatorio para compilar por consola, pero sí es útil para firmar y depurar.

### Servidor y red

Laravel debe escuchar en todas las interfaces:

```powershell
cd C:\MisProyectos\Optica\backend
php artisan serve --host=0.0.0.0 --port=8000
```

Permite el puerto **8000** en el Firewall de Windows si el teléfono no conecta. Para la versión web de desarrollo también puede hacer falta el puerto **4200**. Desde una consola de administrador puedes crear la regla:

```powershell
New-NetFirewallRule -DisplayName "Optica API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
New-NetFirewallRule -DisplayName "Optica Web 4200" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow
```

En `backend/.env`, los orígenes permitidos incluyen las direcciones de la app:

```dotenv
FRONTEND_URL=http://localhost:4200,http://localhost,https://localhost
```

`http://localhost` es el origen que usa el WebView del APK empaquetado con Capacitor.

### Producción

Para un APK de producción:

1. Publica Laravel con **HTTPS**.
2. Cambia la URL del APK a `https://tu-dominio/api`.
3. Genera el APK de release y fírmalo.
4. Configura `FRONTEND_URL` con el dominio real.

El APK actual permite HTTP local para pruebas (`usesCleartextTraffic`). En producción se recomienda HTTPS y restringir el tráfico sin cifrar.

## Verificación realizada

- PWA:
  - Service worker activo y controlando la aplicación.
  - Manifest válido, nombre **Óptica**, tema turquesa, íconos 192 px y 512 px.
  - `Page.getInstallabilityErrors` sin errores.
  - Evento `beforeinstallprompt` recibido en Chrome.
- APK:
  - Compilado correctamente con Gradle.
  - Paquete: `com.optica.gestion`.
  - Nombre visible: **Óptica**.
  - Permiso de cámara incluido.
  - Íconos y splash generados con la identidad visual.
  - Archivos web incluidos y URL de API configurada.

## Limitaciones

- La PWA y el APK necesitan el servidor encendido; no son una copia offline de la base de datos.
- El APK empaqueta la interfaz, pero las fotos, clientes y pedidos se consultan en línea.
- Si cambias la URL del servidor, debes regenerar el APK.
- Las actualizaciones de la interfaz en el APK requieren regenerarlo; la PWA se actualiza al recargar.
- Si no hay internet o el servidor no responde, la aplicación muestra una pantalla de aviso con la causa probable y un botón **Reintentar**. Cuando la conexión vuelve, el aviso desaparece automáticamente.
