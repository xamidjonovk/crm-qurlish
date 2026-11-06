"""Add clearly labeled sample leads to an explicitly named company's sample residence."""

import argparse
from datetime import timedelta

from sqlalchemy.engine import make_url
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models import Apartment, Company, Complex, Lead, now


def seed(company_slug: str, allow_production: bool = False):
    db = make_url(settings().database_url.get_secret_value()).database or ""
    if not db.startswith("course_crm_") and not allow_production:
        raise SystemExit("Explicit --production is required outside a demo database")
    with Session(engine()) as session:
        company = session.exec(
            select(Company).where(Company.slug == company_slug)
        ).first()
        if company is None:
            raise SystemExit("Company not found")
        complex_ = session.exec(
            select(Complex).where(
                Complex.company_id == company.id,
                Complex.name == "Chinor Park · 3D namuna",
            )
        ).first()
        if complex_ is None:
            raise SystemExit("Sample residence not found")
        if session.exec(
            select(Lead).where(
                Lead.company_id == company.id, Lead.source == "demo-dashboard-v1"
            )
        ).first():
            print("Sample leads already exist; no changes made")
            return
        apartments = session.exec(
            select(Apartment)
            .where(
                Apartment.company_id == company.id,
                Apartment.complex_id == complex_.id,
                Apartment.availability == "available",
            )
            .order_by(Apartment.id)
        ).all()
        if len(apartments) < 36:
            raise SystemExit("Not enough available sample apartments")
        names = [
            "Aziza",
            "Jasur",
            "Malika",
            "Sardor",
            "Dilnoza",
            "Bekzod",
            "Madina",
            "Sherzod",
        ]
        for i in range(36):
            session.add(
                Lead(
                    company_id=company.id,
                    apartment_id=apartments[i].id,
                    full_name=f"Namuna {names[i % len(names)]} {i + 1}",
                    phone=f"+99800{i + 1:07d}",
                    stage=["new", "contacted", "viewing", "lost"][i % 4],
                    source="demo-dashboard-v1",
                    consent_at=now() - timedelta(days=(i * 7) % 29),
                )
            )
        session.commit()
    print("36 clearly labeled sample leads added")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--company", required=True)
    parser.add_argument("--production", action="store_true")
    args = parser.parse_args()
    seed(args.company, args.production)
