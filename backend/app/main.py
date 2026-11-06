from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.db import async_engine, engine
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.inventory.router import router as inventory_router
from app.modules.leads.router import router as crm_router
from app.modules.public.router import router
from app.modules.users.router import router as users_router

from .observability import install


@asynccontextmanager
async def lifespan(app):
    yield
    if async_engine.cache_info().currsize:
        await async_engine().dispose()
    if engine.cache_info().currsize:
        engine().dispose()


app = FastAPI(title="Construction CRM", lifespan=lifespan)
app.include_router(router)
app.include_router(catalog_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    try:
        async with async_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "Database unavailable") from None
    return {"status": "ready"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings().allowed_hosts)
install(app)
app.include_router(auth_router)
app.include_router(crm_router)
app.include_router(users_router)
app.include_router(inventory_router)
