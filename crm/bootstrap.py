"""Create a company's first admin interactively, never print credentials."""

import getpass
import re

from sqlmodel import Session, select

from .auth import passwords
from .db import engine
from .identity import User
from .models import Company


def main():
    slug = input("Company slug: ").strip()
    username = input("Admin username: ").strip().lower()
    if not re.fullmatch(r"[a-z0-9-]{3,60}", slug) or not re.fullmatch(
        r"[a-z0-9_.-]{3,80}", username
    ):
        raise SystemExit("Invalid slug or username")
    password = getpass.getpass("New admin password (12+ characters): ")
    if len(password) < 12 or len(password) > 128:
        raise SystemExit("Password length must be 12..128")
    with Session(engine()) as session:
        company = session.exec(select(Company).where(Company.slug == slug)).first()
        if company is None:
            company = Company(slug=slug, name=input("Company name: ").strip())
            session.add(company)
            session.flush()
        if session.exec(
            select(User).where(User.company_id == company.id, User.role == "admin")
        ).first():
            raise SystemExit(
                "Company already has an admin; use the approved account recovery process"
            )
        session.add(
            User(
                company_id=company.id,
                username=username,
                password_hash=passwords.hash(password),
                role="admin",
            )
        )
        session.commit()
    print("Admin created; credentials not logged")


if __name__ == "__main__":
    main()
