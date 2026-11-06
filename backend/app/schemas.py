from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ComplexRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ApartmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complex_id: int
    number: str
    rooms: int
    price_uzs: int
    availability: str
    building_id: int | None = None
    floor: int = 1
    facade: str = "front"
    position: int = 0
    area_m2: float | None = None
    interior_url: str | None = None
    floor_plan_url: str | None = None
    visualization_note: str | None = None


class LeadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(pattern=r"^\+998\d{9}$")
    apartment_id: int = Field(gt=0)
    consent: Literal[True]

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Ism kamida ikki belgidan iborat bo‘lsin")
        return value


class LeadReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    stage: str


class LeadRead(LeadReceipt):
    full_name: str
    phone: str
    apartment_id: int
    version: int


class StageChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage: Literal["new", "contacted", "viewing", "won", "lost"]
    expected_version: int = Field(ge=1)
