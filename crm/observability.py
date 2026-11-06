import json
import logging
from time import perf_counter
from uuid import uuid4

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("crm.http")


def install(app):
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    @app.middleware("http")
    async def requests(request, call_next):
        request.state.request_id = uuid4().hex
        started = perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        route = request.scope.get("route")
        logger.info(
            json.dumps(
                {
                    "request_id": request.state.request_id,
                    "method": request.method,
                    "route": getattr(route, "path", "unmatched"),
                    "status": response.status_code,
                    "duration_ms": round((perf_counter() - started) * 1000, 2),
                }
            )
        )
        return response

    @app.exception_handler(RequestValidationError)
    async def validation(request, exc):
        # Pydantic errors can contain raw body/password/phone; expose only location/type.
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {"loc": list(error["loc"]), "type": error["type"]}
                    for error in exc.errors()
                ]
            },
        )

    @app.exception_handler(Exception)
    async def unexpected(request, exc):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            "unhandled_error request_id=%s type=%s", request_id, type(exc).__name__
        )
        return JSONResponse(
            status_code=500, content={"detail": "Ichki xato", "request_id": request_id}
        )
