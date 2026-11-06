from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKeyConstraint,
    Index,
    UniqueConstraint,
)
from sqlmodel import Field, SQLModel


def now():
    return datetime.now(timezone.utc)


class Company(SQLModel, table=True):
    __tablename__ = "companies"
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, max_length=60)
    name: str = Field(max_length=120)


class Complex(SQLModel, table=True):
    __tablename__ = "complexes"
    __table_args__ = (UniqueConstraint("company_id", "id"),)
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    name: str = Field(max_length=120)


class Building(SQLModel, table=True):
    __tablename__ = "buildings"
    __table_args__ = (
        UniqueConstraint("company_id", "complex_id", "id"),
        UniqueConstraint("complex_id", "name"),
        ForeignKeyConstraint(
            ["company_id", "complex_id"], ["complexes.company_id", "complexes.id"]
        ),
        CheckConstraint("floors BETWEEN 1 AND 60", name="ck_building_floors"),
        CheckConstraint("width >= 8 AND depth >= 8", name="ck_building_dimensions"),
    )
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    complex_id: int = Field(index=True)
    name: str = Field(max_length=60)
    floors: int = 7
    x: float = 0
    z: float = 0
    rotation: float = 0
    width: float = 22
    depth: float = 14
    color: str = Field(default="#e5dfd2", max_length=7)


class Apartment(SQLModel, table=True):
    __tablename__ = "apartments"
    __table_args__ = (
        UniqueConstraint("company_id", "id"),
        UniqueConstraint("complex_id", "number"),
        ForeignKeyConstraint(
            ["company_id", "complex_id"], ["complexes.company_id", "complexes.id"]
        ),
        ForeignKeyConstraint(
            ["company_id", "complex_id", "building_id"],
            ["buildings.company_id", "buildings.complex_id", "buildings.id"],
        ),
        UniqueConstraint(
            "building_id", "floor", "facade", "position", name="uq_apartment_placement"
        ),
        Index("ix_apartment_scene", "company_id", "complex_id", "building_id"),
        CheckConstraint(
            "floor BETWEEN 1 AND 60 AND position BETWEEN 0 AND 11",
            name="ck_apartment_placement",
        ),
        CheckConstraint("area_m2 IS NULL OR area_m2 > 0", name="ck_apartment_area"),
        CheckConstraint(
            "facade IN ('front','back','left','right')", name="ck_apartment_facade"
        ),
        CheckConstraint(
            "rooms BETWEEN 1 AND 10 AND price_uzs > 0", name="ck_apartment_values"
        ),
    )
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    complex_id: int = Field(index=True)
    number: str = Field(max_length=30)
    rooms: int
    price_uzs: int = Field(sa_column=Column(BigInteger, nullable=False))
    availability: str = Field(default="available", max_length=20)
    building_id: int | None = Field(default=None)
    floor: int = 1
    facade: str = Field(default="front", max_length=10)
    position: int = 0
    area_m2: float | None = None
    interior_url: str | None = Field(default=None, max_length=1000)
    floor_plan_url: str | None = Field(default=None, max_length=1000)
    visualization_note: str | None = Field(default=None, max_length=300)


class Lead(SQLModel, table=True):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("company_id", "id"),
        ForeignKeyConstraint(
            ["company_id", "apartment_id"], ["apartments.company_id", "apartments.id"]
        ),
        CheckConstraint(
            "stage IN ('new','contacted','viewing','won','lost')", name="ck_lead_stage"
        ),
    )
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    apartment_id: int = Field(index=True)
    full_name: str = Field(max_length=80)
    phone: str = Field(max_length=13)
    stage: str = Field(default="new", max_length=20)
    source: str = Field(default="web", max_length=30)
    version: int = 1
    consent_at: datetime = Field(
        default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False)
    )
