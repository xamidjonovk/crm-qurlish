from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlmodel import select

from app.core.db import SessionDep
from app.identity import User
from app.models import Apartment, Building, Complex, Lead
from app.modules.auth.router import require_permission
from app.modules.catalog.router import find, save
from app.modules.public.router import company_id
from app.modules.residence.schemas import BuildingInput, BuildingRead, ResidenceRead
from app.schemas import ComplexRead

ReadDep = Annotated[User, Depends(require_permission("leads:read"))]
WriteDep = Annotated[User, Depends(require_permission("inventory:write"))]
router = APIRouter(tags=["3D Residence"])
prefix = "/api/v1/crm/residence"


@router.get("/api/v1/crm/dashboard")
async def dashboard(user: ReadDep, session: SessionDep):
    lead_rows = (await session.exec(select(Lead.stage, func.count(Lead.id)).where(Lead.company_id == user.company_id).group_by(Lead.stage))).all()
    stock_rows = (await session.exec(select(Apartment.availability, func.count(Apartment.id)).where(Apartment.company_id == user.company_id).group_by(Apartment.availability))).all()
    return {"leads": dict(lead_rows), "apartments": dict(stock_rows)}


async def scene(session, tenant, complex_id):
    complex_ = (
        await session.exec(
            select(Complex).where(
                Complex.id == complex_id,
                Complex.company_id == tenant,
            )
        )
    ).first()
    if complex_ is None:
        raise HTTPException(404, "Majmua topilmadi")
    buildings = (
        await session.exec(
            select(Building)
            .where(
                Building.company_id == tenant,
                Building.complex_id == complex_id,
            )
            .order_by(Building.id)
        )
    ).all()
    apartments = (
        await session.exec(
            select(Apartment)
            .where(
                Apartment.company_id == tenant,
                Apartment.complex_id == complex_id,
            )
            .order_by(
                Apartment.building_id,
                Apartment.floor,
                Apartment.facade,
                Apartment.position,
                Apartment.id,
            )
        )
    ).all()
    return {"complex": complex_, "buildings": buildings, "apartments": apartments}


@router.get(prefix + "/complexes", response_model=list[ComplexRead])
async def complexes(user: ReadDep, session: SessionDep):
    return (
        await session.exec(
            select(Complex)
            .where(Complex.company_id == user.company_id)
            .order_by(Complex.id)
        )
    ).all()


@router.get(prefix + "/complexes/{complex_id}", response_model=ResidenceRead)
async def residence(
    complex_id: int, user: ReadDep, session: SessionDep, response: Response
):
    response.headers["Cache-Control"] = "private, no-store"
    return await scene(session, user.company_id, complex_id)


@router.get(
    "/api/v1/companies/{slug}/residence/{complex_id}", response_model=ResidenceRead
)
async def public_residence(
    slug: str, complex_id: int, session: SessionDep, response: Response
):
    response.headers["Cache-Control"] = "no-store"
    return await scene(session, await company_id(session, slug), complex_id)


@router.post(
    prefix + "/complexes/{complex_id}/buildings",
    response_model=BuildingRead,
    status_code=201,
)
async def create_building(
    complex_id: int, data: BuildingInput, user: WriteDep, session: SessionDep
):
    await find(session, Complex, complex_id, user.company_id)
    item = Building(
        company_id=user.company_id, complex_id=complex_id, **data.model_dump()
    )
    return await save(session, item, user, "building.created")


@router.put(prefix + "/buildings/{building_id}", response_model=BuildingRead)
async def edit_building(
    building_id: int, data: BuildingInput, user: WriteDep, session: SessionDep
):
    item = await find(session, Building, building_id, user.company_id)
    highest = (
        await session.exec(
            select(func.max(Apartment.floor)).where(
                Apartment.building_id == item.id,
                Apartment.company_id == user.company_id,
            )
        )
    ).one()
    if highest and highest > data.floors:
        raise HTTPException(
            409, "Yuqori qavatda xonadon bor; qavat sonini kamaytirib bo‘lmaydi"
        )
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    return await save(session, item, user, "building.updated")


@router.delete(prefix + "/buildings/{building_id}", status_code=204)
async def delete_building(building_id: int, user: WriteDep, session: SessionDep):
    item = await find(session, Building, building_id, user.company_id)
    await save(session, item, user, "building.deleted", delete=True)
    return Response(status_code=204)
