# Sistema de Gestión para Óptica

Sistema web completo para registrar clientes, conservar recetas ópticas con fotografías, buscar fichas en segundos y controlar los pedidos hasta su entrega. Está pensado para dos personas con poca experiencia técnica: las pantallas usan lenguaje sencillo, botones grandes y un flujo corto.

- Frontend: **Angular 22** (standalone, Material, SCSS, Reactive Forms, HttpClient).
- Backend: **Laravel 12** (API REST, Eloquent, Sanctum, Storage privado).
- Base de datos: **MySQL 8 / MariaDB 10.4+** (probado con MariaDB 10.4.32).
- Idioma de la interfaz: **español**.

## Estado de la entrega

Todas las funcionalidades solicitadas están implementadas y probadas:

- Autenticación con usuarios, cierre de sesión, cambio de contraseña y usuarios activos/inactivos.
- Creación de nuevos usuarios desde el menú **Crear usuario**, con listado y estado activo/inactivo.
- Registro de clientes con aviso de posibles duplicados y confirmación explícita.
- Búsqueda dinámica por nombre parcial o celular.
- Recetas con fotografías privadas, vista previa, visor ampliado y descarga protegida.
- Reutilización de una receta anterior para un pedido nuevo, sin modificar la original.
- Pedidos con estados, saldo automático, historial de cambios y entrega con fecha/hora/usuario.
- Pantallas de pedidos pendientes, avisos de entrega, historial y centro de avisos.
- Avisos para pedidos listos y pendientes antiguos, con plazo configurable y sin duplicados.
- Paginación en clientes, usuarios, pedidos, entregas, avisos, historial y fichas de cliente (recetas y pedidos).
- Diseño responsive para computadora y celular.
- Instalación como **PWA** desde el navegador (manifest, service worker e íconos propios).
- **APK Android** con Capacitor, cámara habilitada e íconos/splash de la óptica.
- Aviso automático de **sin conexión** con diagnóstico de red/servidor y botón para reintentar.
- Ayudas y observaciones en cada campo, validaciones en navegador y servidor, y mensajes de error en español.
- Respaldos de base de datos y fotografías con restauración verificada.

Los montos de precio, adelanto y saldo se muestran en **bolivianos (Bs)** con formato local.

Resultados de las pruebas ejecutadas: **42 pruebas de backend aprobadas (180 aserciones)**, build de producción de Angular aprobado, **18 comprobaciones E2E** con navegador real (Chrome), **PWA instalable verificada** (service worker activo, manifest válido y sin errores de instalación), **aviso de sin conexión verificado** y **APK Android compilado** correctamente.

## Estructura

```text
Optica/
├─ backend/                 API Laravel 12
│  ├─ app/                  Modelos, controladores, requests, servicios
│  ├─ database/migrations/  Esquema relacional
│  ├─ database/seeders/     Usuarios iniciales y configuración
│  ├─ routes/api.php        Endpoints protegidos
│  └─ storage/app/private/  Fotografías privadas (no públicas)
├─ frontend/                Aplicación Angular 22
│  ├─ src/app/core/         Servicios, modelos, guards, interceptores
│  ├─ src/app/features/     Login, inicio, clientes, recetas, pedidos, avisos, historial
│  ├─ src/app/shared/       Layout, visor de imágenes, diálogos
│  └─ e2e/smoke.mjs         Prueba E2E con navegador real
├─ scripts/                 backup.ps1 y restore.ps1
├─ docs/                    Despliegue y respaldos
└─ README.md
```

Además incluye `frontend/android/` (proyecto Capacitor), `frontend/assets/` (íconos y splash), `apk/` (APK generado) y `scripts/build-apk.ps1`.

## Requisitos

- **PHP 8.2+** con extensiones `pdo_mysql`, `fileinfo`, `mbstring`, `openssl`, `zip`.
- **Composer 2.x**.
- **Node.js 22+** y npm (probado con Node 26).
- **MySQL 8** o **MariaDB 10.4+**.
- Navegador moderno. En celular se recomienda HTTPS para la cámara.
- Opcional para generar el APK: **JDK 17** y **Android SDK 34** (el equipo ya los tiene instalados).

La aplicación no requiere GD ni librerías de procesamiento de imágenes: las fotografías se conservan tal como se toman, sin recortes ni alteraciones.

## Instalación rápida (Windows + XAMPP)

### 1. Base de datos

Desde phpMyAdmin o la consola de MySQL:

```sql
CREATE DATABASE optica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```powershell
cd C:\MisProyectos\Optica\backend
composer install
copy .env.example .env
php artisan key:generate
```

Edita `.env` con tus datos de conexión:

```dotenv
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=optica
DB_USERNAME=root
DB_PASSWORD=
FRONTEND_URL=http://localhost:4200,http://localhost,https://localhost
APP_TIMEZONE=America/Lima
```

Crea las tablas y los usuarios iniciales:

```powershell
php artisan migrate --seed
```

Arranca la API:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

### 3. Frontend

```powershell
cd C:\MisProyectos\Optica\frontend
npm install
npm start -- --host 0.0.0.0
```

Abre **http://localhost:4200**.

La URL de la API en desarrollo está en `frontend/src/environments/environment.development.ts` (`http://localhost:8000/api`).

### 4. Usuarios iniciales

| Nombre | Usuario | Contraseña |
| --- | --- | --- |
| Ana Torres | `ana` | `Optica2026*` |
| Luis Ramírez | `luis` | `Optica2026*` |

Ambos tienen los mismos permisos. Por seguridad, cambia las contraseñas desde el menú de usuario (arriba a la derecha → **Cambiar contraseña**) después del primer ingreso.

## Uso desde el celular en la misma red

1. Averigua la IP local de la computadora, por ejemplo `192.168.1.50`.
2. En `frontend/src/environments/environment.development.ts` cambia la URL a `http://192.168.1.50:8000/api` y reinicia Angular.
3. En `backend/.env` permite el origen del celular (puedes separar varios con coma) y reinicia Laravel:
   `FRONTEND_URL=http://192.168.1.50:4200`
4. Permite los puertos 8000 y 4200 en el firewall de Windows.
5. Abre `http://192.168.1.50:4200` en el celular.

Para producción, usa siempre **HTTPS**: el navegador puede bloquear la cámara en conexiones HTTP no locales.

## Instalar en el celular (PWA o APK)

La aplicación incluye dos opciones de instalación:

### PWA

Se instala desde Chrome, Edge o Safari y se agrega a la pantalla de inicio. Requiere una compilación de producción publicada con **HTTPS** (o `localhost`). Desde el menú lateral aparece la opción **Instalar app**; también funciona desde el menú del navegador.

### APK Android

Ya existe un APK compilado en:

```text
C:\MisProyectos\Optica\apk\Optica-debug.apk
```

Está configurado para la red local actual (`http://192.168.101.85:8000/api`). Para instalarlo:

1. Copia el APK al teléfono.
2. Permite la instalación de aplicaciones desconocidas.
3. Conéctate a la misma red Wi-Fi de la computadora.
4. Verifica que Laravel escuche en `0.0.0.0:8000` y que el firewall permita ese puerto.

Si la IP de la computadora cambia, genera un nuevo APK:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -ApiUrl "http://192.168.1.50:8000/api"
```

El APK empaqueta la interfaz, pero los clientes, recetas, fotos y pedidos se consultan en el servidor. Instrucciones completas, requisitos, firma y consideraciones de producción en **[docs/INSTALACION-MOVIL.md](docs/INSTALACION-MOVIL.md)**.

## Fotografías de recetas

- Se guardan en el disco privado de Laravel: `backend/storage/app/private/prescriptions/{receta}/{uuid}.jpg|png|webp`.
- En MySQL solo se guarda la ruta y los metadatos (nombre original, tipo, tamaño, usuario y fecha).
- No se usan Base64 ni archivos públicos.
- La visualización pasa por `GET /api/prescription-images/{id}/file` con token de sesión; Angular descarga la imagen como blob autenticado.
- La descarga usa `GET /api/prescription-images/{id}/download`.
- Formatos permitidos: JPG, JPEG, PNG, WEBP. Tamaño máximo por foto: 10 MB. Hasta 8 fotos por receta.
- La cámara se abre directamente en computadora (cámara web) y celular mediante `getUserMedia`; si el equipo tiene varias cámaras se puede cambiar desde el visor. Requiere HTTPS o `localhost`.
- Si el navegador no permite acceder a la cámara, queda disponible la opción “Elegir de galería”.
- Las imágenes originales nunca se modifican ni se recortan.

## Reglas de negocio principales

- Un cliente puede tener muchas recetas y muchos pedidos.
- Una receta puede usarse en varios pedidos sin perder su versión original.
- Todo pedido queda vinculado a una receta del mismo cliente.
- Estados: **Pendiente → Listo para entregar → Entregado**. También se puede cancelar mientras no esté entregado.
- Al entregar se guardan fecha, hora y usuario responsable; el historial de estados no se borra.
- Los estados entregados y cancelados son finales (no se reabren desde la interfaz).
- El saldo se calcula automáticamente como `precio - adelanto`; ambos montos son opcionales.
- Los pedidos pendientes generan avisos según el plazo configurado (5 días por defecto). También se genera un aviso de atención a los `2 × plazo` días sin actualización.
- Los avisos son individuales por usuario, no se duplican y se marcan como leídos al entregar o cancelar el pedido.
- No existen endpoints para eliminar clientes, recetas, pedidos o fotografías: el historial se conserva.

## API REST (resumen)

Todas las rutas, excepto `POST /api/login`, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/login` | Inicio de sesión (limitado a 5 intentos/minuto) |
| GET | `/api/me` | Usuario autenticado |
| POST | `/api/logout` | Cerrar sesión y revocar token |
| POST | `/api/change-password` | Cambiar contraseña |
| GET | `/api/dashboard` | Estadísticas y avisos |
| GET | `/api/clients` | Buscar/listar clientes (paginado) |
| GET | `/api/clients/duplicates` | Consultar posibles duplicados |
| POST | `/api/clients` | Registrar cliente |
| GET | `/api/clients/{id}` | Ficha completa con recetas y pedidos |
| PUT | `/api/clients/{id}` | Editar datos del cliente |
| GET | `/api/prescriptions` | Historial de recetas con filtros |
| POST | `/api/prescriptions` | Crear receta con fotos (multipart) |
| GET | `/api/prescriptions/{id}` | Detalle de receta |
| POST | `/api/prescriptions/{id}/images` | Agregar fotos a una receta |
| GET | `/api/prescription-images/{id}/file` | Ver foto (autenticado) |
| GET | `/api/prescription-images/{id}/download` | Descargar foto |
| GET | `/api/orders` | Listar/filtrar pedidos |
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders/{id}` | Detalle e historial |
| PATCH | `/api/orders/{id}/status` | Cambiar estado |
| GET | `/api/notifications` | Avisos del usuario |
| GET | `/api/notifications/unread-count` | Contador de avisos |
| POST | `/api/notifications/{id}/read` | Marcar aviso como leído |
| POST | `/api/notifications/read-all` | Marcar todos como leídos |
| GET | `/api/settings` | Configuración de avisos |
| PUT | `/api/settings` | Cambiar días de aviso |
| GET | `/api/users` | Listar usuarios (paginado) |
| POST | `/api/users` | Crear un usuario |

Las respuestas usan JSON, paginación estándar de Laravel y errores de validación `422`. Los conflictos de posible duplicado responden `409`.

## Pruebas

### Backend (42 pruebas, 180 aserciones)

```powershell
cd backend
php artisan test
```

Cubren autenticación, permisos, creación y paginación de usuarios, clientes, duplicados, búsqueda, recetas con imágenes privadas, pedidos, transiciones válidas e inválidas, notificaciones sin duplicados, configuración de avisos y estadísticas.

### Frontend (build de producción)

```powershell
cd frontend
npm run build
```

### PWA y APK

La compilación de producción genera `manifest.webmanifest`, `ngsw-worker.js` e íconos. Se verificó en Chrome:

- Service worker activo y controlando la aplicación.
- Manifest válido con nombre, tema e íconos.
- Sin errores de instalación (`InstallabilityErrors` vacío).
- Evento `beforeinstallprompt` recibido.

Para generar el APK:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -ApiUrl "http://192.168.101.85:8000/api"
```

El resultado queda en `apk/Optica-debug.apk`. Detalles en [docs/INSTALACION-MOVIL.md](docs/INSTALACION-MOVIL.md).

También se verificó el modo sin conexión con Chrome: al perder la red aparece **“Sin conexión a internet – Verifica tu red e inténtalo nuevamente”**, y al recuperarla el aviso desaparece automáticamente. Si la red existe pero el servidor no responde, el mensaje indica que no se puede conectar con el servidor.

### Prueba E2E con navegador real

Con los dos servidores activos (`php artisan serve` y `npm start`):

```powershell
cd frontend
npm run e2e
```

La prueba usa Chrome/Edge instalado (ruta configurable con `CHROME_PATH`). Recorre 18 comprobaciones: login, dashboard, registro, duplicados, búsqueda por nombre y celular, receta con foto, visor, pedido, estados, entrega, historial, avisos, móvil y segundo usuario. **Importante:** crea un cliente, una receta y un pedido de prueba en la base de datos activa; úsala solo en desarrollo.

## Respaldos y restauración

Scripts incluidos:

```powershell
# Respaldo completo (base de datos + fotografías + configuración)
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1

# Restaurar (pide confirmación)
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 -BackupZip "C:\ruta\optica_20261103_221940.zip"
```

El respaldo genera un ZIP en `backups/`. Incluye `database.sql`, `storage/prescriptions` y `config/env`. El procedimiento completo, la programación automática con el Programador de tareas y las advertencias de seguridad están en **[docs/RESPALDOS.md](docs/RESPALDOS.md)**.

La restauración fue verificada sobre una base temporal (`optica_restore_test`) comparando tablas y archivos, sin tocar los datos de producción.

## Despliegue

Instrucciones de producción, Nginx/Apache, HTTPS, permisos, límites de subida de PHP y checklist de seguridad en **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

Resumen:

```powershell
cd frontend
npm ci
npm run build
# publicar dist/frontend/browser en el servidor web

cd ..\backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

En producción usa `APP_DEBUG=false`, HTTPS y un usuario de MySQL con permisos solo sobre `optica`.

## Decisiones técnicas relevantes

- **Sanctum con tokens Bearer** (no cookies): funciona bien con Angular en otro puerto/dominio durante desarrollo y mantiene las rutas protegidas.
- **Imágenes fuera de `public/`** y servidas por un endpoint autenticado; Angular las muestra como blobs. Así no quedan accesibles por URL pública.
- **Fotografías originales sin procesar**: se prioriza que la receta siga siendo legible; no hay OCR ni edición.
- **Historial inmutable**: no se permite eliminar pedidos entregados, recetas ni clientes. Los cambios se registran en `order_status_histories` y `audit_logs`.
- **Bloqueo de pedidos** con `lockForUpdate` al cambiar estado para evitar inconsistencias si los dos usuarios trabajan a la vez.
- **Avisos sin duplicados** mediante índice único `(user_id, order_id, type)`.
- **Zona horaria configurable** con `APP_TIMEZONE` (`America/Lima` por defecto) y fechas de negocio en formato `Y-m-d`.
- **Sin módulos adicionales**: no hay facturación, WhatsApp automático ni roles/permisos avanzados; la gestión de usuarios es básica (crear y listar).

## Problemas frecuentes

| Problema | Solución |
| --- | --- |
| `401` al navegar | El token venció o el usuario fue desactivado. Vuelve a iniciar sesión. |
| Error CORS en desarrollo | Revisa `FRONTEND_URL` en `backend/.env` y reinicia Laravel. Debe coincidir con el origen exacto (incluido el puerto). |
| La cámara no abre en el celular | Usa HTTPS o `localhost`, revisa permisos del navegador y que la página no esté en modo privado restrictivo. |
| Error al subir fotos grandes | Ajusta `upload_max_filesize` y `post_max_size` en PHP (ver despliegue). |
| Las fotos no se ven | Verifica que exista `backend/storage/app/private/prescriptions` y que el usuario esté autenticado. |
| Fechas desfasadas | Configura `APP_TIMEZONE` y la zona horaria del servidor; las fechas de negocio se guardan como fecha sin hora. |
| El APK no conecta | Verifica que Laravel escuche en `0.0.0.0:8000`, que el puerto 8000 esté permitido en el firewall, que el celular esté en la misma Wi-Fi y que la IP coincida con la usada al generar el APK. |
| No aparece la opción de instalar PWA | La PWA requiere compilación de producción con HTTPS (o `localhost`); en desarrollo usa el APK o publica la versión web. |
| Aparece “Sin conexión a internet” | Revisa la red del equipo. Si aparece “No podemos conectar con el servidor”, verifica que Laravel esté encendido, escuchando en `0.0.0.0:8000` y accesible desde el dispositivo. |

## Documentación adicional

- [Validaciones y observaciones por módulo](docs/VALIDACIONES.md)
- [Instalación en celular (PWA y APK)](docs/INSTALACION-MOVIL.md)
- [Despliegue en producción](docs/DESPLIEGUE.md)
- [Respaldos y restauración](docs/RESPALDOS.md)
- [API y frontend (backend/README.md)](backend/README.md)
- [Comandos del frontend (frontend/README.md)](frontend/README.md)
