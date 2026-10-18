from fastapi import FastAPI, Request

CABECERAS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    # Render sirve solo por https; el navegador recordará usar https durante un año
    "Strict-Transport-Security": "max-age=31536000",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


def instalar_cabeceras(app: FastAPI) -> None:
    @app.middleware("http")
    async def agregar_cabeceras(request: Request, call_next):
        respuesta = await call_next(request)
        for nombre, valor in CABECERAS.items():
            respuesta.headers.setdefault(nombre, valor)
        return respuesta
