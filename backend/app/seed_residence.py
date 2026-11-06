"""Explicit, additive 4-building / 7-floor synthetic residence for local demos."""

import argparse

from sqlalchemy.engine import make_url
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models import Apartment, Building, Company, Complex


def seed(company_slug="ozod-demo", allow_production=False):
    url = make_url(settings().database_url.get_secret_value())
    if not (url.database or "").startswith("course_crm_") and not allow_production:
        raise SystemExit("Only course_crm_ demo/test databases are supported")
    with Session(engine()) as session:
        company = session.exec(
            select(Company).where(Company.slug == company_slug)
        ).first()
        if company is None:
            raise SystemExit("Requested company does not exist")
        if session.exec(
            select(Complex).where(
                Complex.company_id == company.id,
                Complex.name == "Chinor Park · 3D namuna",
            )
        ).first():
            print("3D demo already exists; existing inventory unchanged")
            return
        complex_ = Complex(company_id=company.id, name="Chinor Park · 3D namuna")
        session.add(complex_)
        session.flush()
        for i, (x, z) in enumerate([(-21, -18), (21, -18), (-21, 18), (21, 18)]):
            building = Building(
                company_id=company.id,
                complex_id=complex_.id,
                name=f"{chr(65 + i)} bino",
                x=x,
                z=z,
                floors=7,
                color=["#e8dfce", "#ddd9cf", "#e4ddd0", "#d8dedb"][i],
            )
            session.add(building)
            session.flush()
            for floor in range(1, 8):
                for side in ("front", "back"):
                    for position in range(3):
                        serial = (
                            (floor - 1) * 6
                            + (3 if side == "back" else 0)
                            + position
                            + 1
                        )
                        rooms = [2, 3, 1][position]
                        area = [64.8, 86.4, 42.6][position] + i * 1.2
                        status = (
                            "sold"
                            if (serial + i * 5) % 7 in (0, 1)
                            else "reserved"
                            if (serial + i) % 11 == 0
                            else "available"
                        )
                        session.add(
                            Apartment(
                                company_id=company.id,
                                complex_id=complex_.id,
                                building_id=building.id,
                                number=f"{chr(65 + i)}-{serial:02}",
                                rooms=rooms,
                                price_uzs=round(area * (12_000_000 + floor * 100_000)),
                                availability=status,
                                floor=floor,
                                facade=side,
                                position=position,
                                area_m2=round(area, 1),
                                interior_url="/assets/residence/interior-sample.webp",
                                visualization_note="AI yordamida yaratilgan namunaviy interyer. Planirovka sxematik; haqiqiy loyiha chizmasi emas.",
                            )
                        )
        session.commit()
    print("3D demo ready: 4 buildings, 7 floors, 168 synthetic apartments")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add a clearly labeled sample residence to an existing company")
    parser.add_argument("--company", default="ozod-demo")
    parser.add_argument("--production", action="store_true", help="Explicitly allow additive sample data in production")
    args = parser.parse_args()
    seed(args.company, args.production)
