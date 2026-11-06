import mimetypes
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.db import async_engine, engine
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.inventory.router import router as inventory_router
from app.modules.leads.router import router as crm_router
from app.modules.public.router import router, site_router
from app.modules.residence.router import router as residence_router
from app.modules.users.router import router as users_router

from .observability import install

mimetypes.add_type("image/webp", ".webp")


@asynccontextmanager
async def lifespan(app):
    yield
    if async_engine.cache_info().currsize:
        await async_engine().dispose()
    if engine.cache_info().currsize:
        engine().dispose()


app = FastAPI(title="Construction CRM", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)
app.include_router(router)
app.include_router(site_router)
app.include_router(catalog_router)

frontend_dir = Path(
    os.environ.get("FRONTEND_DIR", Path(__file__).resolve().parents[2] / "frontend" / "out")
)
if (frontend_dir / "_next").is_dir():
    app.mount("/_next", StaticFiles(directory=frontend_dir / "_next"), name="next-assets")
if (frontend_dir / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_dir / "assets"), name="media-assets")


@app.get("/", include_in_schema=False)
def index(request: Request):
    if request.url.hostname in settings().api_only_hosts:
        return RedirectResponse(url="/docs")
    if (frontend_dir / "index.html").is_file():
        return FileResponse(frontend_dir / "index.html")
    return RedirectResponse(url="/docs")


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
app.include_router(residence_router)
