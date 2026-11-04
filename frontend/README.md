# Frontend Angular 22 — Óptica

Aplicación web responsive para la gestión de la óptica. Usa Angular standalone, Angular Material, Reactive Forms, HttpClient, guards e interceptores.

## Desarrollo

```powershell
npm install
npm start -- --host 0.0.0.0
```

Abre `http://localhost:4200`.

La API de desarrollo se configura en `src/environments/environment.development.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
};
```

## Producción

```powershell
npm ci
npm run build
```

El resultado queda en `dist/frontend/browser`. La URL de la API en producción se toma de `public/app-config.js`; si está vacía se usa `/api` del mismo dominio. Para un APK o una API en otro dominio, el script de APK escribe esa URL automáticamente. Consulta [docs/DESPLIEGUE.md](../docs/DESPLIEGUE.md).

## PWA

La compilación de producción incluye:

- `public/manifest.webmanifest`
- `public/icons/*`
- `public/apple-touch-icon.png`
- `ngsw-config.json`
- Service worker de Angular

El service worker se registra solo en producción y no se activa dentro del APK. La instalación requiere HTTPS o `localhost`.

## APK Android

La plataforma Android está creada con Capacitor en `android/`. Para generar el APK:

```powershell
# Con la IP actual detectada
npm run apk

# O indicando explícitamente el servidor
npm run apk -- -ApiUrl "http://192.168.101.85:8000/api"
```

El APK se copia a `../apk/Optica-debug.apk`. Requiere JDK 17 y Android SDK 34. Revisa [docs/INSTALACION-MOVIL.md](../docs/INSTALACION-MOVIL.md).

Para sincronizar cambios después de una compilación manual:

```powershell
npx cap sync android
```

## Prueba E2E

Con Laravel y Angular en ejecución:

```powershell
npm run e2e
```

Usa Chrome (ruta configurable con `CHROME_PATH`) y comprueba login, clientes, duplicados, búsquedas, recetas con foto, visor, pedidos, estados, entregas, historial, avisos, vista móvil y segunda cuenta.

La prueba **crea un cliente, una receta y un pedido de prueba** en la base de datos activa; úsala solo en desarrollo.

Capturas: `%TEMP%\optica-e2e-screenshots`.

## Carpetas

- `src/app/core/`: modelos, servicios, guards, interceptores y utilidades.
- `src/app/features/`: login, dashboard, usuarios, clientes, recetas, pedidos, entregas, avisos e historial.
- `src/app/shared/`: layout, visor de imágenes, cámara, paginación y diálogos reutilizables.
- `android/`: proyecto Android generado con Capacitor.
- `assets/`: íconos y splash de origen para generar recursos nativos.
- `e2e/smoke.mjs`: recorrido E2E con Puppeteer.
