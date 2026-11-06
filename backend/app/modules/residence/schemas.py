from typing import Literal
from urllib.parse import urlsplit

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlmodel import select

from app.models import Building
from app.schemas import ApartmentRead, ComplexRead


class ApartmentPlacement(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    building_id: int | None = Field(default=None, gt=0)
    floor: int = Field(default=1, ge=1, le=60)
    facade: Literal["front", "back", "left", "right"] = "front"
    position: int = Field(default=0, ge=0, le=11)
    area_m2: float | None = Field(default=None, gt=0, le=10000)
    interior_url: str | None = Field(default=None, max_length=1000)
    floor_plan_url: str | None = Field(default=None, max_length=1000)
    visualization_note: str | None = Field(default=None, max_length=300)

    @field_validator("interior_url", "floor_plan_url")
    @classmethod
    def media_url(cls, value):
        if value is None:
            return value
        if value.startswith("/assets/") and ".." not in value and "\\" not in value:
            return value
        parsed = urlsplit(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or "\\" in value
        ):
            raise ValueError("Rasm HTTPS manzili yoki /assets/ yo‘li bo‘lishi kerak")
        return value


class BuildingInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    name: str = Field(min_length=1, max_length=60)
    floors: int = Field(default=7, ge=1, le=60)
    x: float = Field(default=0, ge=-500, le=500)
    z: float = Field(default=0, ge=-500, le=500)
    rotation: float = Field(default=0, ge=-180, le=180)
    width: float = Field(default=22, ge=8, le=100)
    depth: float = Field(default=14, ge=8, le=100)
    color: str = Field(default="#e5dfd2", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("Bino nomini kiriting")
        return value.strip()


class BuildingRead(BuildingInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complex_id: int


class ResidenceRead(BaseModel):
    complex: ComplexRead
    buildings: list[BuildingRead]
    apartments: list[ApartmentRead]


async def validate_placement(session, company_id, complex_id, values):
    if values.get("building_id") is None:
        return
    building = (
        await session.exec(
            select(Building)
            .where(
                Building.id == values["building_id"],
                Building.company_id == company_id,
                Building.complex_id == complex_id,
            )
            .with_for_update()
        )
    ).first()
    if building is None:
        raise HTTPException(404, "Shu majmuada bino topilmadi")
    if values.get("floor", 1) > building.floors:
        raise HTTPException(422, "Qavat bino qavatlari sonidan oshmasin")
