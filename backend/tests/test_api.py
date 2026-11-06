import asyncio
import os
import sys
from uuid import uuid4

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://unused:unused@localhost/course_crm_unused"
)
os.environ.setdefault("JWT_SECRET", "test-secret-" * 5)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url
from sqlmodel import Session

from app.core.db import engine
from app.core.security import passwords
from app.identity import User
from app.main import app
from app.models import Apartment, Company, Complex


def make_client():
    options = (
        {"loop_factory": asyncio.SelectorEventLoop} if sys.platform == "win32" else {}
    )
    return TestClient(app, backend_options=options)


def test_health_and_routes():
    with make_client() as client:
        assert client.get("/health").json() == {"status": "ok"}
        paths = client.get("/openapi.json").json()["paths"]
        for path in (
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/crm/users",
            "/api/v1/crm/arizalar",
            "/api/v1/crm/catalog/complexes",
            "/api/v1/crm/inventory/apartments",
            "/api/v1/companies/{slug}/kvartiralar",
        ):
            assert path in paths


@pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"),
    reason="Requires a disposable PostgreSQL test database",
)
def test_auth_catalog_and_leads():
    url = make_url(os.environ["DATABASE_URL"])
    assert url == make_url(os.environ["TEST_DATABASE_URL"])
    assert url.database and url.database.startswith("course_crm_")
    suffix = uuid4().hex[:12]
    with Session(engine()) as db:
        company = Company(slug=f"test-{suffix}", name="Test")
        db.add(company)
        db.flush()
        complex_ = Complex(company_id=company.id, name="Complex")
        db.add(complex_)
        db.flush()
        apartment = Apartment(
            company_id=company.id,
            complex_id=complex_.id,
            number="1",
            rooms=2,
            price_uzs=100,
        )
        db.add(apartment)
        db.add(
            User(
                company_id=company.id,
                username=f"admin{suffix}",
                password_hash=passwords.hash("strong-password-123"),
                role="admin",
            )
        )
        db.commit()
        apartment_id, slug = apartment.id, company.slug
    with make_client() as client:
        assert client.get("/ready").status_code == 200
        login = client.post(
            "/api/v1/auth/login",
            data={"username": f"admin{suffix}", "password": "strong-password-123"},
        )
        assert login.status_code == 200, login.text
        tokens = login.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
        assert client.get(f"/api/v1/companies/{slug}/kvartiralar").status_code == 200
        lead = client.post(
            f"/api/v1/companies/{slug}/arizalar",
            json={
                "full_name": "Test User",
                "phone": "+998901234567",
                "apartment_id": apartment_id,
                "consent": True,
            },
        )
        assert lead.status_code == 201, lead.text
        assert (
            client.get("/api/v1/crm/arizalar", headers=headers).json()[0]["id"]
            == lead.json()["id"]
        )
        rotated = client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert rotated.status_code == 200
        assert (
            client.post(
                "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
            ).status_code
            == 401
        )
        assert (
            client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": rotated.json()["refresh_token"]},
            ).status_code
            == 401
        )


def test_frontend_and_api_domain_routing(monkeypatch, tmp_path):
    from app import main
    from app.core.config import settings

    (tmp_path / "index.html").write_text("<!doctype html><title>Qurilish CRM</title>")
    monkeypatch.setattr(main, "frontend_dir", tmp_path)
    with make_client() as client:
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "Qurilish CRM" in response.text
        monkeypatch.setattr(settings(), "api_only_hosts", ["testserver"])
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/docs"
        assert client.get("/health").status_code == 200
