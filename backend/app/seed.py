from sqlmodel import Session, select

from app.core.db import engine
from app.models import Apartment, Company, Complex


def seed():
    with Session(engine()) as session:
        if session.exec(select(Company)).first():
            raise SystemExit(
                "Seed requires an empty training database; existing data untouched"
            )
        for slug in ["demo-a", "demo-b"]:
            company = Company(slug=slug, name=f"Demo {slug}")
            session.add(company)
            session.flush()
            complex_ = Complex(company_id=company.id, name="O‘quv majmuasi")
            session.add(complex_)
            session.flush()
            for number, rooms in [("A-12", 2), ("B-08", 3)]:
                session.add(
                    Apartment(
                        company_id=company.id,
                        complex_id=complex_.id,
                        number=number,
                        rooms=rooms,
                        price_uzs=780_000_000,
                    )
                )
        session.commit()


if __name__ == "__main__":
    seed()
