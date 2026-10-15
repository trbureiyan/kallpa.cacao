# Cacao en campo - PWA

Frontend React para registrar recepciones de cacao en zonas con conectividad intermitente. La app se instala como PWA, conserva el formulario en IndexedDB antes de enviarlo y sincroniza los registros pendientes cuando hay conexión y una sesión válida.

## Ejecutar

Requiere Node.js 20 o superior y el backend activo.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Abre `http://localhost:5173`. El backend debe estar en `http://localhost:8000`; para otra dirección, configura `VITE_API_BASE_URL` en `.env`.

Para levantar frontend, API y PostgreSQL juntos, desde `backend/` usa `docker compose up --build`. La PWA queda disponible en `http://localhost:8080` y el backend en `http://localhost:8000`.

## Preparar el dispositivo de campo

1. Con conexión, inicia sesión como `operador` (datos de demostración del backend: `Operador123!`).
2. Espera a que se descargue el catálogo de fincas y a que la PWA termine de cargar.
3. En el navegador, instala la aplicación si ofrece la opción **Instalar aplicación**. Para desplegarla en campo, publícala con HTTPS.
4. Sin red, registra recepciones. Cada registro se conserva localmente con su propia clave de idempotencia.
5. Al volver la conexión, abre la app e inicia sesión si hace falta. Los registros se envían en orden; un error de red conserva el registro y un conflicto queda marcado para corrección.

Para probar el service worker y el modo instalable, genera la versión de producción con `npm run build` y sírvela con `npm run preview`. El modo desarrollo está habilitado, pero la caché de producción es la referencia para la demostración sin conexión.

## Ensayo de captura sin cobertura

1. Abre la PWA con conexión, inicia sesión y confirma que aparezcan fincas.
2. En DevTools, activa el modo de red sin conexión y recarga una vez para verificar que se muestra el app shell desde el service worker.
3. Registra un lote nuevo. Debe aparecer como **Pendiente** y permanecer después de recargar.
4. Restablece la conexión. Si la sesión venció, inicia sesión; el registro debe pasar a **Sincronizado**.
5. Comprueba en `/docs` que el lote y su movimiento de recepción aparezcan una sola vez, incluso si reintentas la sincronización.

## Datos locales y sincronización

- IndexedDB conserva fincas descargadas y recepciones pendientes/sincronizadas; recargar la página no elimina la cola.
- El token de acceso vive en `sessionStorage`, separado de la cola. Si vence, la app conserva los registros y solicita iniciar sesión otra vez.
- Se sincroniza al recuperar conectividad y mientras la aplicación permanece abierta. No depende de sincronización en segundo plano, que no tiene soporte uniforme en todos los navegadores.
- La captura local de primera vez requiere preparar la app con conexión para autenticar al operador y descargar las fincas. No se permite crear productores/fincas sin conexión en esta fase.
- Esta fase sincroniza **recepciones**. Las transformaciones sin conexión requieren después una estrategia de conflictos de inventario entre dispositivos.
- IndexedDB es almacenamiento del dispositivo, no un respaldo remoto. No borres los datos del navegador ni desinstales la PWA mientras existan registros pendientes.

## Rutas usadas

- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `GET /api/v1/farms`
- `POST /api/v1/receptions`
- `GET /api/v1/lots/{id}` y `GET /api/v1/lots/{id}/movements`
