from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

INMUTABLE = "public, max-age=31536000, immutable"
SIN_CACHE = "no-cache"


def montar_frontend(app: FastAPI, dist: Path) -> bool:
    """Sirve el build del frontend (PWA) desde la API, para ejecutar todo en un solo proceso.

    Devuelve False sin registrar nada si no existe `dist/index.html` (por ejemplo en Docker, donde sirve nginx).
    Debe llamarse DESPUÉS de registrar los routers y /health: la ruta comodín solo atiende lo que ninguna otra tomó.
    """
    index = dist / "index.html"
    if not index.is_file():
        return False
    raiz = dist.resolve()

    @app.api_route("/{ruta:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def servir_frontend(ruta: str):
        # una ruta de API desconocida debe dar 404, no el HTML de la aplicación
        if ruta == "api" or ruta.startswith("api/"):
            raise HTTPException(404, "Ruta de API no encontrada")
        if ruta:
            archivo = (raiz / ruta).resolve()
            # el archivo debe estar dentro del build: ".." no puede sacar nada de la carpeta
            if archivo.is_file() and raiz in archivo.parents:
                # los assets llevan hash en el nombre y no cambian; el service worker y el manifiesto no deben cachearse
                cache = INMUTABLE if ruta.startswith("assets/") else SIN_CACHE
                return FileResponse(archivo, headers={"Cache-Control": cache})
            if ruta.startswith("assets/"):
                raise HTTPException(404, "Archivo no encontrado")
        # el resto son rutas de la aplicación (React Router): las resuelve el navegador desde el index
        return FileResponse(index, headers={"Cache-Control": SIN_CACHE})

    return True
