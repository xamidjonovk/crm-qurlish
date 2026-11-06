from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from sqlalchemy.exc import IntegrityError
from sqlmodel import or_, select

from .auth import UserDep, WriterDep, passwords
from .db import SessionDep
from .identity import Audit, User
from .models import Lead
from .schemas import LeadRead, StageChange

router = APIRouter(prefix="/api/v1/crm", tags=["CRM"])
ALLOWED = {
    "new": {"contacted", "lost"},
    "contacted": {"viewing", "lost"},
    "viewing": {"won", "lost"},
    "won": set(),
    "lost": set(),
}


def find_lead(session, user, lead_id, *, lock=False):
    query = select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    if lock:
        query = query.with_for_update()
    lead = session.exec(query).first()
    if lead is None:
        raise HTTPException(404, "Ariza topilmadi")
    return lead


@router.get("/arizalar", response_model=list[LeadRead])
def leads(
    user: UserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    stage: Literal["new", "contacted", "viewing", "won", "lost"] | None = None,
    q: Annotated[str | None, Query(min_length=2, max_length=80)] = None,
):
    statement = select(Lead).where(Lead.company_id == user.company_id)
    if stage is not None:
        statement = statement.where(Lead.stage == stage)
    if q is not None:
        statement = statement.where(
            or_(
                Lead.full_name.contains(q, autoescape=True),
                Lead.phone.contains(q, autoescape=True),
            )
        )
    return session.exec(statement.order_by(Lead.id).offset(offset).limit(limit)).all()


@router.get("/arizalar/{lead_id}", response_model=LeadRead)
def detail(lead_id: int, user: UserDep, session: SessionDep):
    return find_lead(session, user, lead_id)


@router.patch("/arizalar/{lead_id}/stage", response_model=LeadRead)
def stage(lead_id: int, data: StageChange, user: WriterDep, session: SessionDep):
    lead = find_lead(session, user, lead_id, lock=True)
    if lead.version != data.expected_version:
        raise HTTPException(409, "Versiya eskirgan; arizani qayta o‘qing")
    if data.stage != lead.stage and data.stage not in ALLOWED[lead.stage]:
        raise HTTPException(409, "Bosqich tartibi noto‘g‘ri")
    if data.stage == "won" and lead.stage != "won":
        raise HTTPException(409, "Sotuvni bron confirm orqali yakunlang")
    lead.stage = data.stage
    lead.version += 1
    session.add(lead)
    session.add(
        Audit(
            company_id=user.company_id,
            actor_id=user.id,
            action="lead.stage." + data.stage,
            resource_id=lead_id,
        )
    )
    session.commit()
    session.refresh(lead)
    return lead


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(pattern=r"^[a-z0-9_.-]{3,80}$")
    password: SecretStr = Field(min_length=12, max_length=128)
    role: Literal["seller", "viewer"]


@router.post("/users", status_code=201)
def create_user(data: UserCreate, user: UserDep, session: SessionDep):
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
        session.flush()
        session.add(
            Audit(
                company_id=user.company_id,
                actor_id=user.id,
                action="user.created",
                resource_id=new.id,
            )
        )
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Username band") from None
    return {"id": new.id, "username": new.username, "role": new.role}


@router.get("/users")
def users(
    user: UserDep, session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 20
):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    rows = session.exec(
        select(User)
        .where(User.company_id == user.company_id)
        .order_by(User.id)
        .limit(limit)
    ).all()
    return [
        {"id": row.id, "username": row.username, "role": row.role, "active": row.active}
        for row in rows
    ]


@router.get("/audit")
def audit(
    user: UserDep, session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 20
):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    return session.exec(
        select(Audit)
        .where(Audit.company_id == user.company_id)
        .order_by(Audit.id.desc())
        .limit(limit)
    ).all()


@router.post("/users/{user_id}/deactivate", status_code=204)
def deactivate(user_id: int, user: UserDep, session: SessionDep):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")
    target = session.exec(
        select(User)
        .where(User.id == user_id, User.company_id == user.company_id)
        .with_for_update()
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
        session.commit()
