from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .auth import router as auth_router
from .catalog_admin import router as catalog_router
from .config import settings
from .crm_api import router as crm_router
from .db import engine
from .inventory import router as inventory_router
from .observability import install
from .public import router


@asynccontextmanager
async def lifespan(app):
    yield
    engine().dispose()


app = FastAPI(title="Construction CRM", lifespan=lifespan)
app.include_router(router)
app.include_router(catalog_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        with engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "Database unavailable") from None
    return {"status": "ready"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
install(app)
app.include_router(auth_router)
app.include_router(crm_router)
app.include_router(inventory_router)
