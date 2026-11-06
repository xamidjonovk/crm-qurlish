from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.core.db import SessionDep
from app.identity import Audit, User
from app.models import Apartment, Complex
from app.modules.auth.router import require_permission
from app.schemas import ApartmentRead, ComplexRead

AdminDep = Annotated[User, Depends(require_permission("inventory:write"))]
router = APIRouter(prefix="/api/v1/crm/catalog", tags=["Catalog CRUD"])


class ComplexInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)


class ApartmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    complex_id: int = Field(gt=0)
    number: str = Field(min_length=1, max_length=30)
    rooms: int = Field(ge=1, le=10)
    price_uzs: int = Field(gt=0, le=10**15)


class ApartmentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    number: str | None = Field(default=None, min_length=1, max_length=30)
    rooms: int | None = Field(default=None, ge=1, le=10)


async def find(session, model, item_id, company_id):
    item = (
        await session.exec(
            select(model)
            .where(model.id == item_id, model.company_id == company_id)
            .with_for_update()
        )
    ).first()
    if item is None:
        raise HTTPException(404, "Obyekt topilmadi")
    return item


async def save(session, item, user, action, *, delete=False):
    try:
        if delete:
            await session.delete(item)
        else:
            session.add(item)
        await session.flush()
        session.add(
            Audit(
                company_id=user.company_id,
                actor_id=user.id,
                action=action,
                resource_id=item.id,
            )
        )
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            409, "Bog‘langan yozuv mavjud yoki qiymat takrorlangan"
        ) from None
    if not delete:
        await session.refresh(item)
    return item


@router.get("/complexes", response_model=list[ComplexRead])
async def complexes(
    user: AdminDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return (
        await session.exec(
            select(Complex)
            .where(Complex.company_id == user.company_id)
            .order_by(Complex.id)
            .offset(offset)
            .limit(limit)
        )
    ).all()


@router.post("/complexes", response_model=ComplexRead, status_code=201)
async def create_complex(data: ComplexInput, user: AdminDep, session: SessionDep):
    return await save(
        session,
        Complex(company_id=user.company_id, **data.model_dump()),
        user,
        "complex.created",
    )


@router.get("/complexes/{item_id}", response_model=ComplexRead)
async def complex_detail(item_id: int, user: AdminDep, session: SessionDep):
    return await find(session, Complex, item_id, user.company_id)


@router.put("/complexes/{item_id}", response_model=ComplexRead)
async def replace_complex(
    item_id: int, data: ComplexInput, user: AdminDep, session: SessionDep
):
    item = await find(session, Complex, item_id, user.company_id)
    item.name = data.name
    return await save(session, item, user, "complex.updated")


@router.delete("/complexes/{item_id}", status_code=204)
async def delete_complex(item_id: int, user: AdminDep, session: SessionDep):
    await save(
        session,
        await find(session, Complex, item_id, user.company_id),
        user,
        "complex.deleted",
        delete=True,
    )
    return Response(status_code=204)


@router.get("/apartments", response_model=list[ApartmentRead])
async def apartments(
    user: AdminDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return (
        await session.exec(
            select(Apartment)
            .where(Apartment.company_id == user.company_id)
            .order_by(Apartment.id)
            .offset(offset)
            .limit(limit)
        )
    ).all()


@router.post("/apartments", response_model=ApartmentRead, status_code=201)
async def create_apartment(data: ApartmentInput, user: AdminDep, session: SessionDep):
    await find(session, Complex, data.complex_id, user.company_id)
    return await save(
        session,
        Apartment(company_id=user.company_id, **data.model_dump()),
        user,
        "apartment.created",
    )


@router.get("/apartments/{item_id}", response_model=ApartmentRead)
async def apartment_detail(item_id: int, user: AdminDep, session: SessionDep):
    return await find(session, Apartment, item_id, user.company_id)


@router.patch("/apartments/{item_id}", response_model=ApartmentRead)
async def edit_apartment(
    item_id: int, data: ApartmentPatch, user: AdminDep, session: SessionDep
):
    item = await find(session, Apartment, item_id, user.company_id)
    values = data.model_dump(exclude_unset=True)
    if not values or any((value is None for value in values.values())):
        raise HTTPException(422, "Kamida bitta bo‘sh bo‘lmagan maydon kerak")
    if item.availability != "available":
        raise HTTPException(409, "Bron yoki sotilgan xonadonni tahrirlab bo‘lmaydi")
    for key, value in values.items():
        setattr(item, key, value)
    return await save(session, item, user, "apartment.updated")


@router.delete("/apartments/{item_id}", status_code=204)
async def delete_apartment(item_id: int, user: AdminDep, session: SessionDep):
    item = await find(session, Apartment, item_id, user.company_id)
    if item.availability != "available":
        raise HTTPException(409, "Bron yoki sotilgan xonadonni o‘chirib bo‘lmaydi")
    await save(session, item, user, "apartment.deleted", delete=True)
    return Response(status_code=204)
