from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.core.db import SessionDep
from app.identity import Audit, User
from app.models import Apartment, Complex
from app.modules.auth.router import require_permission
from app.modules.residence.schemas import ApartmentPlacement, validate_placement
from app.schemas import ApartmentRead

AdminDep = Annotated[User, Depends(require_permission("inventory:write"))]
router = APIRouter(prefix="/api/v1/crm/inventory", tags=["Inventory"])


class ComplexInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)


class ApartmentInput(ApartmentPlacement):
    model_config = ConfigDict(extra="forbid")
    complex_id: int = Field(gt=0)
    number: str = Field(min_length=1, max_length=30)
    rooms: int = Field(ge=1, le=10)
    price_uzs: int = Field(gt=0, le=10**15)


def admin(user):
    if user.role != "admin":
        raise HTTPException(403, "Faqat admin")


@router.post("/complexes", status_code=201)
async def create_complex(data: ComplexInput, user: AdminDep, session: SessionDep):
    admin(user)
    item = Complex(company_id=user.company_id, name=data.name)
    session.add(item)
    await session.flush()
    session.add(
        Audit(
            company_id=user.company_id,
            actor_id=user.id,
            action="complex.created",
            resource_id=item.id,
        )
    )
    await session.commit()
    return {"id": item.id, "name": item.name}


@router.post("/apartments", status_code=201, response_model=ApartmentRead)
async def create_apartment(data: ApartmentInput, user: AdminDep, session: SessionDep):
    admin(user)
    complex_ = (
        await session.exec(
            select(Complex).where(
                Complex.id == data.complex_id, Complex.company_id == user.company_id
            )
        )
    ).first()
    if complex_ is None:
        raise HTTPException(404, "Majmua topilmadi")
    await validate_placement(
        session, user.company_id, data.complex_id, data.model_dump()
    )
    item = Apartment(company_id=user.company_id, **data.model_dump())
    session.add(item)
    try:
        await session.flush()
        session.add(
            Audit(
                company_id=user.company_id,
                actor_id=user.id,
                action="apartment.created",
                resource_id=item.id,
            )
        )
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(409, "Shu majmuada xonadon raqami mavjud") from None
    return item


class PriceChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    price_uzs: int = Field(gt=0, le=10**15)
    expected_price_uzs: int = Field(gt=0)


@router.patch("/apartments/{apartment_id}/price", response_model=ApartmentRead)
async def change_price(
    apartment_id: int, data: PriceChange, user: AdminDep, session: SessionDep
):
    admin(user)
    item = (
        await session.exec(
            select(Apartment)
            .where(
                Apartment.id == apartment_id, Apartment.company_id == user.company_id
            )
            .with_for_update()
        )
    ).first()
    if item is None:
        raise HTTPException(404, "Xonadon topilmadi")
    if item.availability != "available" or item.price_uzs != data.expected_price_uzs:
        raise HTTPException(409, "Holat yoki narx o‘zgargan; katalogni qayta o‘qing")
    item.price_uzs = data.price_uzs
    session.add(item)
    session.add(
        Audit(
            company_id=user.company_id,
            actor_id=user.id,
            action="apartment.price_changed",
            resource_id=item.id,
        )
    )
    await session.commit()
    await session.refresh(item)
    return item
