# Despliegue en producción

Esta guía asume un servidor Linux con Nginx y PHP-FPM. También se indican notas para Windows/XAMPP.

## 1. Arquitectura recomendada

```text
https://optica.ejemplo.com        → Angular (archivos estáticos)
https://api.optica.ejemplo.com    → Laravel (PHP-FPM)
                                      └─ MySQL/MariaDB
```

Separar la aplicación y la API en subdominios evita problemas de rutas y permite escalar cada parte. Si usas un solo dominio, configura `/api` como proxy hacia Laravel.

## 2. Preparar el servidor

- PHP 8.2+ con `pdo_mysql`, `fileinfo`, `mbstring`, `openssl`, `zip`.
- Composer 2.
- MySQL 8 o MariaDB 10.4+.
- Node.js 20+ solo para compilar Angular (puede hacerse en otra máquina).
- Nginx y PHP-FPM.
- Certificado SSL (Let's Encrypt). **La cámara requiere HTTPS.**

Extensiones y límites recomendados en `php.ini`:

```ini
upload_max_filesize = 12M
post_max_size = 90M
max_file_uploads = 20
max_execution_time = 120
memory_limit = 256M
```

`post_max_size` debe permitir hasta 8 fotos de 10 MB en una sola receta.

## 3. Base de datos

```sql
CREATE DATABASE optica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'optica'@'localhost' IDENTIFIED BY 'UNA_CLAVE_SEGURA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON optica.* TO 'optica'@'localhost';
FLUSH PRIVILEGES;
```

El usuario necesita permisos DDL para ejecutar migraciones. Si prefieres separar, ejecuta las migraciones con un usuario administrador y deja al usuario de la aplicación solo con DML.

## 4. Backend

```bash
cd /var/www/optica/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Configura `.env`:

```dotenv
APP_NAME=Optica
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.optica.ejemplo.com
APP_TIMEZONE=America/Lima

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=optica
DB_USERNAME=optica
DB_PASSWORD=UNA_CLAVE_SEGURA

FRONTEND_URL=https://optica.ejemplo.com
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
LOG_LEVEL=warning
```

Permisos:

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

Migraciones y cachés:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Para actualizar una instalación existente:

```bash
cd /var/www/optica/backend
php artisan down
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up
```

## 5. Nginx para la API

```nginx
server {
    listen 443 ssl http2;
    server_name api.optica.ejemplo.com;

    root /var/www/optica/backend/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/api.optica.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.optica.ejemplo.com/privkey.pem;

    client_max_body_size 90M;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_read_timeout 120s;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

No publiques `storage/app/private` ni el archivo `.env`.

## 6. Frontend

La URL de producción está en `frontend/src/environments/environment.ts`:

```ts
export const environment = {
  production: true,
  apiUrl: 'https://api.optica.ejemplo.com/api',
};
```

Compila en una máquina con Node:

```bash
cd /var/www/optica/frontend
npm ci
npm run build
```

Publica el contenido de `dist/frontend/browser` en el servidor web.

### Nginx para Angular

```nginx
server {
    listen 443 ssl http2;
    server_name optica.ejemplo.com;

    root /var/www/optica/frontend/dist/frontend/browser;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/optica.ejemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/optica.ejemplo.com/privkey.pem;

    client_max_body_size 90M;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|jpg|jpeg|png|webp|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

### Opción de un solo dominio

Si prefieres `https://optica.ejemplo.com/api`, deja `environment.production.ts` con `apiUrl: '/api'` y publica Angular en la raíz. Añade un proxy:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 90M;
}
```

Usar `php artisan serve` detrás de Nginx solo es aceptable para pruebas; en producción usa PHP-FPM.

## 7. HTTPS y cámara

- Instala certificados con Certbot (Let's Encrypt) o tu proveedor.
- Redirige HTTP a HTTPS.
- Comprueba que el dominio sea exactamente el configurado en `FRONTEND_URL`.
- En iOS, la cámara se abre con el selector de archivos; en Android también se ofrece la cámara. Sin HTTPS el navegador puede denegar el acceso.

## 8. Notas para Windows / XAMPP

- Puedes usar dos VirtualHosts de Apache o mantener `php artisan serve` y `npm start` para pruebas.
- Si usas Apache con Laravel, el `DocumentRoot` debe apuntar a `backend/public`, no a la raíz del proyecto.
- En Angular, configura la URL de la API con la IP o dominio real.
- Habilita las extensiones `fileinfo`, `pdo_mysql` y `zip` en `php.ini`.
- Ajusta `upload_max_filesize` y `post_max_size` en el `php.ini` de XAMPP.
- Para celulares en la misma red, agrega la IP al firewall y a `FRONTEND_URL`.

## 9. Checklist de seguridad

- [ ] `APP_ENV=production` y `APP_DEBUG=false`.
- [ ] HTTPS activo y HTTP redirigido.
- [ ] Contraseñas iniciales cambiadas.
- [ ] `.env` con permisos restringidos (`chmod 600`).
- [ ] Usuario de MySQL dedicado, sin acceso remoto innecesario.
- [ ] `storage/app/private` fuera del alcance público.
- [ ] Copias de seguridad programadas y probadas.
- [ ] Firewall: solo 80/443 públicos; MySQL y PHP-FPM en localhost.
- [ ] Logs de Laravel con rotación (`LOG_LEVEL=warning`).
- [ ] Certificado renovado automáticamente.
- [ ] Revisar que `/api` sin token responda `401`.

## 10. Instalación en celular

Para instalar la PWA desde el navegador o generar el APK Android, revisa [INSTALACION-MOVIL.md](INSTALACION-MOVIL.md). En producción, la PWA requiere HTTPS y el APK debe generarse con la URL HTTPS de la API.

## 11. Verificación posterior al despliegue

1. Inicia sesión con las dos cuentas.
2. Registra un cliente y confirma que aparece en la búsqueda.
3. Sube una foto desde la computadora y otra desde el celular.
4. Abre la foto, amplíala y descárgala.
5. Crea un pedido con una receta anterior.
6. Marca listo y entregado; revisa el historial y el responsable.
7. Comprueba los avisos y el plazo configurado.
8. Ejecuta un respaldo y restáuralo en una base de prueba.
9. Revisa la consola del navegador: no debe haber errores.
10. Prueba en un celular real con HTTPS.
