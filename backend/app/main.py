from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import SessionLocal
from app import models
from app.api import auth, receptions, transformations, lots, inventory, economics, public, exports, alerts, users, analytics, audit
from app.security.authentication import hash_password
from contextlib import asynccontextmanager

def initialize_database():
    if not settings.seed_demo_data:
        return
    with SessionLocal() as db:
        if db.query(models.User).count() == 0:
            db.add_all([
                models.User(username="admin", full_name="Administrador demo", password_hash=hash_password("Admin123!"), role="admin"),
                models.User(username="operador", full_name="Operador demo", password_hash=hash_password("Operador123!"), role="operator"),
            ])
        if db.query(models.Producer).count() == 0:
            db.add_all([models.Producer(code="PROD-A", name="Productor A"), models.Producer(code="PROD-B", name="Productor B"), models.Producer(code="PROD-C", name="Productor C")])
        db.commit()
        if db.query(models.Farm).count() == 0:
            producers = {p.code: p.id for p in db.query(models.Producer).all()}
            db.add_all([models.Farm(producer_id=producers["PROD-A"], name="Finca A", region="Rivera"),
                        models.Farm(producer_id=producers["PROD-B"], name="Finca B", region="Campoalegre"),
                        models.Farm(producer_id=producers["PROD-C"], name="Finca C", region="Algeciras")])
            db.commit()
        if db.query(models.Lot).count() == 0:
            producers = {p.code: p.id for p in db.query(models.Producer).all()}
            farms = {f.region: f.id for f in db.query(models.Farm).all()}
            db.add_all([
                models.Lot(code="CAC001", producer_id=producers["PROD-A"], farm_id=farms["Rivera"], origin="Rivera", received_on=date.today(), received_quantity=100, available_quantity=100, consumed_quantity=0, unit="kg"),
                models.Lot(code="CAC002", producer_id=producers["PROD-B"], farm_id=farms["Campoalegre"], origin="Campoalegre", received_on=date.today(), received_quantity=150, available_quantity=150, consumed_quantity=0, unit="kg"),
                models.Lot(code="CAC003", producer_id=producers["PROD-C"], farm_id=farms["Algeciras"], origin="Algeciras", received_on=date.today(), received_quantity=80, available_quantity=80, consumed_quantity=0, unit="kg"),
            ])
            db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0",
              description="API para recepción, transformación y trazabilidad del cacao.", lifespan=lifespan)
origins = [value.strip() for value in settings.cors_origins.split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for router in (auth.router, users.router, receptions.router, transformations.router, lots.router, inventory.router,
               economics.router, public.router, exports.router, alerts.router, analytics.router, audit.router):
    app.include_router(router, prefix=settings.api_prefix)


@app.get("/health", tags=["Estado"])
def health():
    return {"status": "ok", "service": settings.app_name}
