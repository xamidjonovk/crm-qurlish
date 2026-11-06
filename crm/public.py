from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query
from sqlmodel import select

from .db import SessionDep
from .models import Apartment, Company, Complex, Lead
from .schemas import ApartmentRead, ComplexRead, LeadCreate, LeadReceipt

router = APIRouter(prefix="/api/v1/companies/{slug}", tags=["Public"])


def company_id(session, slug):
    company = session.exec(select(Company).where(Company.slug == slug)).first()
    if company is None:
        raise HTTPException(404, "Kompaniya topilmadi")
    return company.id


@router.get("/kvartiralar", response_model=list[ApartmentRead])
def apartments(
    slug: str,
    session: SessionDep,
    complex_id: Annotated[int | None, Query(ge=1)] = None,
    rooms: Annotated[int | None, Query(ge=1, le=10)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ApartmentRead]:
    statement = select(Apartment).where(
        Apartment.company_id == company_id(session, slug)
    )
    if complex_id is not None:
        statement = statement.where(Apartment.complex_id == complex_id)
    if rooms is not None:
        statement = statement.where(Apartment.rooms == rooms)
    items = session.exec(
        statement.order_by(Apartment.id).offset(offset).limit(limit)
    ).all()
    return [ApartmentRead.model_validate(item) for item in items]


@router.get("/kvartiralar/{apartment_id}", response_model=ApartmentRead)
def detail(slug: str, apartment_id: Annotated[int, Path(ge=1)], session: SessionDep):
    item = session.exec(
        select(Apartment).where(
            Apartment.id == apartment_id,
            Apartment.company_id == company_id(session, slug),
        )
    ).first()
    if item is None:
        raise HTTPException(404, "Xonadon topilmadi")
    return item


@router.get("/majmualar", response_model=list[ComplexRead])
def complexes(slug: str, session: SessionDep):
    return session.exec(
        select(Complex)
        .where(Complex.company_id == company_id(session, slug))
        .order_by(Complex.id)
    ).all()


@router.post("/arizalar", response_model=LeadReceipt, status_code=201)
def submit(slug: str, data: LeadCreate, session: SessionDep):
    tenant = company_id(session, slug)
    apartment = session.exec(
        select(Apartment).where(
            Apartment.id == data.apartment_id, Apartment.company_id == tenant
        )
    ).first()
    if apartment is None:
        raise HTTPException(404, "Xonadon topilmadi")
    if apartment.availability != "available":
        raise HTTPException(409, "Xonadon mavjud emas")
    lead = Lead(company_id=tenant, **data.model_dump(exclude={"consent"}))
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return lead
