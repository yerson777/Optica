# Backend Laravel 12 — Óptica

API REST del sistema de gestión de óptica. Usa Laravel 12, Sanctum (tokens Bearer), Eloquent y almacenamiento privado para las fotografías.

## Instalación

```powershell
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Configura la base de datos y `FRONTEND_URL` en `.env`. Consulta las instrucciones completas en el [README principal](../README.md).

## Estructura relevante

- `app/Http/Controllers/Api/`: controladores de autenticación, usuarios, clientes, recetas, pedidos, avisos, ajustes e inicio.
- `app/Http/Requests/Api/`: validaciones de formularios y archivos.
- `app/Models/`: modelos Eloquent y reglas de estado.
- `app/Services/`: creación/cambio de pedidos, notificaciones, almacenamiento de imágenes y auditoría.
- `app/Http/Middleware/EnsureUserIsActive.php`: bloquea usuarios inactivos.
- `routes/api.php`: todas las rutas de la API.
- `database/migrations/`: esquema relacional completo.
- `database/seeders/DatabaseSeeder.php`: usuarios `ana` y `luis` + configuración inicial.

## Fotografías

Se almacenan en `storage/app/private/prescriptions` y se sirven mediante rutas autenticadas:

- `GET /api/prescription-images/{id}/file`
- `GET /api/prescription-images/{id}/download`

No se exponen por `public/` ni se guardan en Base64.

## Pruebas

```powershell
php artisan test
```

Las pruebas usan SQLite en memoria y `Storage::fake('local')`, por lo que no modifican la base real ni las fotos.

## Usuarios iniciales

- `ana` / `Optica2026*`
- `luis` / `Optica2026*`

Cambia las contraseñas desde la interfaz después del primer ingreso.

## Respaldos

Los scripts de respaldo y restauración están en `../scripts/` y se documentan en [docs/RESPALDOS.md](../docs/RESPALDOS.md).
