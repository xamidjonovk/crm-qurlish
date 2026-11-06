from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, create_engine

from .config import settings


@lru_cache
def engine():
    return create_engine(
        settings().database_url.get_secret_value(),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=5,
        connect_args={"connect_timeout": 5, "options": "-c statement_timeout=5000"},
    )


def get_session() -> Iterator[Session]:
    with Session(engine()) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
