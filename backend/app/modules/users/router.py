from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.core.db import SessionDep
from app.core.security import passwords
from app.identity import Audit, User
from app.modules.auth.router import UserDep

router = APIRouter(prefix="/api/v1/crm", tags=["CRM"])


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(pattern="^[a-z0-9_.-]{3,80}$")
    password: SecretStr = Field(min_length=12, max_length=128)
    role: Literal["seller", "viewer"]


@router.post("/users", status_code=201)
async def create_user(data: UserCreate, user: UserDep, session: SessionDep):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    new = User(
        company_id=user.company_id,
        username=data.username,
        password_hash=passwords.hash(data.password.get_secret_value()),
        role=data.role,
    )
    session.add(new)
    try:
        await session.flush()
        session.add(
            Audit(
                company_id=user.company_id,
                actor_id=user.id,
                action="user.created",
                resource_id=new.id,
            )
        )
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "Username band") from None
    return {"id": new.id, "username": new.username, "role": new.role}


@router.get("/users")
async def users(
    user: UserDep, session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 20
):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    rows = (
        await session.exec(
            select(User)
            .where(User.company_id == user.company_id)
            .order_by(User.id)
            .limit(limit)
        )
    ).all()
    return [
        {"id": row.id, "username": row.username, "role": row.role, "active": row.active}
        for row in rows
    ]


@router.get("/audit")
async def audit(
    user: UserDep, session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 20
):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    return (
        await session.exec(
            select(Audit)
            .where(Audit.company_id == user.company_id)
            .order_by(Audit.id.desc())
            .limit(limit)
        )
    ).all()


@router.post("/users/{user_id}/deactivate", status_code=204)
async def deactivate(user_id: int, user: UserDep, session: SessionDep):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    target = (
        await session.exec(
            select(User)
            .where(User.id == user_id, User.company_id == user.company_id)
            .with_for_update()
        )
    ).first()
    if target is None:
        raise HTTPException(404, "Xodim topilmadi")
    if target.role == "admin":
        raise HTTPException(409, "Admin hisobini bu endpoint orqali yopib bo‘lmaydi")
    if target.active:
        target.active = False
        target.credential_version += 1
        session.add(target)
        session.add(
            Audit(
                company_id=user.company_id,
                actor_id=user.id,
                action="user.deactivated",
                resource_id=target.id,
            )
        )
        await session.commit()
