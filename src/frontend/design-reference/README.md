# Referencias de diseño heredadas

Los archivos en `legacy/` se conservaron como referencia visual del material importado. Contienen prototipos que dependían de `react-router-dom`, Dexie y contextos que no forman parte de la aplicación canónica; por eso no se compilan ni se ejecutan.

La aplicación activa está en `src/`: `App.tsx`, `WorkspaceViews.tsx`, `UsersView.tsx` y `BusinessViews.tsx`. Las operaciones persistentes deben pasar por `api.ts` y FastAPI. IndexedDB se reserva para la cola offline de recepciones.
