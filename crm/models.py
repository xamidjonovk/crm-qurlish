from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKeyConstraint,
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


class Apartment(SQLModel, table=True):
    __tablename__ = "apartments"
    __table_args__ = (
        UniqueConstraint("company_id", "id"),
        UniqueConstraint("complex_id", "number"),
        ForeignKeyConstraint(
            ["company_id", "complex_id"], ["complexes.company_id", "complexes.id"]
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
