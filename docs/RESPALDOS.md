# Respaldos y restauración

El sistema respalda tres elementos:

1. **Base de datos MySQL/MariaDB** (`optica`): clientes, recetas, pedidos, avisos, usuarios y auditoría.
2. **Fotografías de recetas**: `backend/storage/app/private/prescriptions`.
3. **Configuración**: `backend/.env` (incluye `APP_KEY` y credenciales).

Los scripts están en `scripts/` y generan un único ZIP con todo lo necesario.

> **Seguridad:** el ZIP contiene datos personales y secretos. Guárdalo en un lugar cifrado y con acceso restringido. No lo subas a repositorios ni a carpetas públicas.

## Crear un respaldo

```powershell
powershell -ExecutionPolicy Bypass -File C:\MisProyectos\Optica\scripts\backup.ps1
```

Opciones útiles:

```powershell
# Cambiar la carpeta de respaldos y la retención (días)
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1 `
  -BackupRoot "D:\Respaldos\Optica" -RetentionDays 60

# Indicar otra ruta de mysqldump o credenciales
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1 `
  -MySqlDump "C:\xampp\mysql\bin\mysqldump.exe" `
  -DbHost 127.0.0.1 -DbPort 3306 -DbName optica `
  -DbUser root -DbPassword "TU_CLAVE"
```

Resultado:

```text
backups/
└─ optica_20261103_221940.zip
   ├─ database.sql
   ├─ manifest.txt
   ├─ config/env
   └─ storage/prescriptions/...
```

La contraseña de MySQL se pasa mediante la variable de proceso `MYSQL_PWD`, no como argumento visible en la línea de comandos.

### Programar el respaldo diario (Windows)

1. Abre **Programador de tareas** → **Crear tarea básica**.
2. Frecuencia: diaria, por ejemplo a las 22:00.
3. Acción: **Iniciar un programa**.
4. Programa: `powershell.exe`
5. Argumentos:

```text
-NoProfile -ExecutionPolicy Bypass -File "C:\MisProyectos\Optica\scripts\backup.ps1" -BackupRoot "D:\Respaldos\Optica" -RetentionDays 60
```

6. Marca “Ejecutar con los privilegios más altos” si el equipo lo requiere.
7. Comprueba el historial del Programador y revisa que el ZIP se genere correctamente.

Además de la copia local, copia periódicamente los ZIP a un disco externo o almacenamiento en la nube cifrado.

### Programar el respaldo en Linux

```bash
0 22 * * * cd /var/www/optica && pwsh -NoProfile -File scripts/backup.ps1 -BackupRoot /var/backups/optica
```

También puedes usar `mysqldump` + `tar` en un cron si prefieres no instalar PowerShell. Lo importante es incluir siempre la base de datos **y** la carpeta de fotografías; un respaldo solo de la base no permite recuperar las recetas.

## Restaurar un respaldo

1. Avisa a los usuarios y detén el acceso a la aplicación:

```powershell
cd C:\MisProyectos\Optica\backend
php artisan down
```

2. Restaura (se pedirá confirmación; escribe `SI`):

```powershell
powershell -ExecutionPolicy Bypass -File C:\MisProyectos\Optica\scripts\restore.ps1 `
  -BackupZip "D:\Respaldos\Optica\optica_20261103_221940.zip"
```

3. El script:
   - Elimina y recrea la base `optica`.
   - Importa `database.sql`.
   - Reemplaza las fotografías actuales por las del respaldo.
   - Opcionalmente restaura `.env` si agregas `-RestoreEnv`.
   - Limpia cachés de Laravel.

4. Vuelve a habilitar la aplicación:

```powershell
php artisan up
```

5. Verifica:
   - Inicio de sesión con las dos cuentas.
   - Ficha de un cliente con fotos visibles.
   - Pedidos e historial.
   - Avisos.
   - Que una foto se pueda ampliar y descargar.

### Restaurar solo en una base de prueba

Antes de restaurar sobre producción, puedes comprobar el respaldo en otra base:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 `
  -BackupZip "D:\Respaldos\Optica\optica_20261103_221940.zip" `
  -Force `
  -DbName optica_restore_test `
  -StoragePath "C:\Temp\optica-restore-test\prescriptions"
```

Esto no toca la base real ni las fotografías actuales. Luego puedes inspeccionar la base `optica_restore_test` y borrarla:

```sql
DROP DATABASE optica_restore_test;
```

La entrega incluye una verificación de este tipo: el respaldo se restauró en `optica_restore_test` y se compararon las tablas (`clients`, `prescriptions`, `prescription_images`, `orders`, `users`) y los archivos de fotos restaurados. Fue satisfactoria.

### Restaurar la configuración

Por defecto el script **no** sobrescribe `.env`, para no romper una instalación que ya funciona. Si estás recuperando el sistema completo en un servidor nuevo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 `
  -BackupZip "D:\Respaldos\Optica\optica_20261103_221940.zip" `
  -RestoreEnv
```

Se conserva una copia del `.env` anterior como `.env.before-restore.FECHA` antes de reemplazarlo.

## Buenas prácticas

- Verifica el respaldo al menos una vez al mes restaurándolo en una base temporal.
- No edites ni muevas manualmente los archivos de `storage/app/private/prescriptions`; si los mueves, la base apuntará a rutas inexistentes.
- Conserva el `APP_KEY` original si restauras la misma instalación; es necesario para datos cifrados y sesiones.
- Realiza el respaldo en un momento de poca actividad y, preferiblemente, con la aplicación en mantenimiento.
- Mantén al menos dos destinos: el disco del servidor y una copia externa cifrada.
- Documenta la contraseña del ZIP fuera del propio servidor (por ejemplo, en un gestor de contraseñas).
