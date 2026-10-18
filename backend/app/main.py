from pathlib import Path
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings, validar_configuracion
from app.frontend import montar_frontend
from app.database import SessionLocal
from app.seed import sembrar_demo
from app.security.headers import instalar_cabeceras
from app.security.rate_limit import instalar_limite
from app.api import auth, receptions, transformations, lots, inventory, economics, public, exports, alerts, users, analytics, audit
from contextlib import asynccontextmanager

def initialize_database():
    if not settings.seed_demo_data:
        return
    with SessionLocal() as db:
        sembrar_demo(db)

@asynccontextmanager
async def lifespan(app: FastAPI):
    problemas = validar_configuracion(settings)
    if problemas:
        raise RuntimeError("Configuración insegura para producción: " + " ".join(problemas))
    initialize_database()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0",
              description="API para recepción, transformación y trazabilidad del cacao.", lifespan=lifespan)


# El 422 por defecto devuelve el valor recibido; un NaN o Infinity no se puede escribir en JSON y terminaba en 500.
# Solo se devuelven campo y mensaje, que es lo que muestra el frontend.
@app.exception_handler(RequestValidationError)
async def validation_error(_request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": [{"loc": list(e.get("loc", ())), "msg": e.get("msg", ""), "type": e.get("type", "")} for e in exc.errors()]})


# el orden importa: el último middleware agregado es el más externo, así las cabeceras también cubren los 429
app.state.limitador = instalar_limite(app, settings.rate_limit_per_minute, settings.rate_limit_login_per_minute, settings.api_prefix)
instalar_cabeceras(app)

origins = [value.strip() for value in settings.cors_origins.split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for router in (auth.router, users.router, receptions.router, transformations.router, lots.router, inventory.router,
               economics.router, public.router, exports.router, alerts.router, analytics.router, audit.router):
    app.include_router(router, prefix=settings.api_prefix)


@app.get("/health", tags=["Estado"])
def health():
    return {"status": "ok", "service": settings.app_name}


# debe ir al final: la ruta comodín del frontend solo atiende lo que ningún router tomó
montar_frontend(app, Path(settings.frontend_dist) if settings.frontend_dist else Path(__file__).resolve().parents[2] / "src" / "frontend" / "dist")
