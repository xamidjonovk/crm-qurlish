"""Run the API with a psycopg-compatible event loop on Windows."""

import asyncio
import sys

import uvicorn


async def main():
    server = uvicorn.Server(uvicorn.Config("app.main:app", host="127.0.0.1", port=8001))
    await server.serve()


if __name__ == "__main__":
    if sys.platform == "win32":
        with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as runner:
            runner.run(main())
    else:
        asyncio.run(main())
