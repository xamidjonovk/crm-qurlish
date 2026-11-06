"""Idempotent Uzbek synthetic fixture; only explicit demo/test databases."""

import os

from sqlalchemy.engine import make_url
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.core.security import passwords
from app.identity import User
from app.models import Apartment, Company, Complex, Lead


def seed():
    database = make_url(settings().database_url.get_secret_value()).database or ""
    if not database.startswith("course_crm_"):
        raise SystemExit("Seed only supports a separate course_crm_ demo/test database")
    password = os.environ.get("DEMO_PASSWORD")
    if not password or len(password) < 12:
        raise SystemExit("Set DEMO_PASSWORD (12+ characters)")
    with Session(engine()) as session:
        if session.exec(select(Company).where(Company.slug == "ozod-demo")).first():
            print("Demo already present; existing data unchanged")
            return
        company = Company(slug="ozod-demo", name="Ozod Qurilish — sinov")
        session.add(company)
        session.flush()
        for username, role in [
            ("demo.admin", "admin"),
            ("demo.sotuvchi", "seller"),
            ("demo.kuzatuvchi", "viewer"),
        ]:
            session.add(
                User(
                    company_id=company.id,
                    username=username,
                    password_hash=passwords.hash(password),
                    role=role,
                )
            )
        names = [
            "Aziz Karimov",
            "Dilnoza Rasulova",
            "Javohir Ergashev",
            "Malika Tursunova",
            "Sardor Ismoilov",
            "Shahnoza Rahimova",
            "Bekzod Qodirov",
            "Madina Usmonova",
        ]
        for index, name in enumerate(
            ["Yangi Hayot", "Chinor Residence", "Bo‘ston Sohili"]
        ):
            complex_ = Complex(company_id=company.id, name=name)
            session.add(complex_)
            session.flush()
            for number in range(1, 13):
                apartment = Apartment(
                    company_id=company.id,
                    complex_id=complex_.id,
                    number=f"{index + 1}-{number:02}",
                    rooms=1 + number % 4,
                    price_uzs=(420 + number * 37 + index * 80) * 1_000_000,
                )
                session.add(apartment)
                session.flush()
                if number <= 8:
                    stage = ["new", "contacted", "viewing", "won", "lost"][number % 5]
                    if stage == "won":
                        apartment.availability = "sold"
                        session.add(apartment)
                    session.add(
                        Lead(
                            company_id=company.id,
                            apartment_id=apartment.id,
                            full_name=names[(number + index) % len(names)],
                            phone=f"+99890{1000000 + index * 100 + number}",
                            stage=stage,
                        )
                    )
        session.commit()
    print("Demo ready: ozod-demo; demo.admin, demo.sotuvchi, demo.kuzatuvchi")


if __name__ == "__main__":
    seed()
