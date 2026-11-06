from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import or_, select

from app.core.db import SessionDep
from app.identity import Audit
from app.models import Apartment, Lead
from app.modules.auth.router import UserDep, WriterDep
from app.schemas import LeadRead, StageChange

router = APIRouter(prefix="/api/v1/crm", tags=["CRM"])
ALLOWED = {
    "new": {"contacted", "lost"},
    "contacted": {"viewing", "lost"},
    "viewing": {"won", "lost"},
    "won": set(),
    "lost": set(),
}


async def find_lead(session, user, lead_id, *, lock=False):
    query = select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    if lock:
        query = query.with_for_update()
    lead = (await session.exec(query)).first()
    if lead is None:
        raise HTTPException(404, "Ariza topilmadi")
    return lead


@router.get("/arizalar", response_model=list[LeadRead])
async def leads(
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
    return (
        await session.exec(statement.order_by(Lead.id.desc()).offset(offset).limit(limit))
    ).all()


@router.get("/arizalar/{lead_id}", response_model=LeadRead)
async def detail(lead_id: int, user: UserDep, session: SessionDep):
    return await find_lead(session, user, lead_id)


@router.patch("/arizalar/{lead_id}/stage", response_model=LeadRead)
async def stage(lead_id: int, data: StageChange, user: WriterDep, session: SessionDep):
    lead = await find_lead(session, user, lead_id, lock=True)
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
    await session.commit()
    await session.refresh(lead)
    return lead


class SaleConfirm(StageChange):
    stage: Literal["won"] = "won"


@router.post("/arizalar/{lead_id}/confirm-sale", response_model=LeadRead)
async def confirm_sale(
    lead_id: int, data: SaleConfirm, user: WriterDep, session: SessionDep
):
    lead = await find_lead(session, user, lead_id, lock=True)
    if lead.version != data.expected_version:
        raise HTTPException(409, "Ariza o‘zgargan; yangilab qayta urinib ko‘ring")
    if lead.stage != "viewing":
        raise HTTPException(409, "Sotuv faqat ko‘rik bosqichidan yakunlanadi")
    apartment = (
        await session.exec(
            select(Apartment)
            .where(
                Apartment.id == lead.apartment_id,
                Apartment.company_id == user.company_id,
            )
            .with_for_update()
        )
    ).first()
    if apartment is None or apartment.availability != "available":
        raise HTTPException(409, "Xonadon sotilgan yoki mavjud emas")
    apartment.availability = "sold"
    lead.stage = "won"
    lead.version += 1
    session.add(apartment)
    session.add(lead)
    session.add(
        Audit(
            company_id=user.company_id,
            actor_id=user.id,
            action="sale.confirmed",
            resource_id=lead.id,
        )
    )
    await session.commit()
    await session.refresh(lead)
    return lead
