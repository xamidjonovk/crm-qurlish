"""Run the local seeded demo without changing .env."""

import asyncio
import os
import sys

from sqlalchemy.engine import make_url

from app.core.config import settings

url = make_url(settings().database_url.get_secret_value())
if url.host not in ("localhost", "127.0.0.1"):
    raise SystemExit("Local PostgreSQL required")
os.environ["DATABASE_URL"] = url.set(
    database="course_crm_frontend_demo"
).render_as_string(hide_password=False)
settings.cache_clear()
if __name__ == "__main__":
    import uvicorn

    async def main():
        server = uvicorn.Server(
            uvicorn.Config(
                "app.main:app",
                host="127.0.0.1",
                port=18765,
                log_level="warning",
                access_log=False,
            )
        )
        await server.serve()

    if sys.platform == "win32":
        with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as runner:
            runner.run(main())
    else:
        asyncio.run(main())
