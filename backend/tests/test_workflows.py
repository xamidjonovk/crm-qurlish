import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from sqlalchemy.engine import make_url
from sqlmodel import Session
from test_api import make_client

from app.core.db import engine
from app.core.security import passwords
from app.identity import User
from app.models import Company


@pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL"
)
def test_crud_permissions_and_atomic_sale():
    url = make_url(os.environ["DATABASE_URL"])
    assert url == make_url(os.environ["TEST_DATABASE_URL"])
    assert url.database.startswith("course_crm_")
    suffix = uuid4().hex[:10]
    password = "synthetic-password-2026"
    with Session(engine()) as session:
        companies = [
            Company(slug=f"sales-{suffix}-{i}", name="Sinov") for i in range(2)
        ]
        session.add_all(companies)
        session.flush()
        for role in ("admin", "seller", "viewer"):
            session.add(
                User(
                    company_id=companies[0].id,
                    username=f"{role}-{suffix}",
                    password_hash=passwords.hash(password),
                    role=role,
                )
            )
        session.add(
            User(
                company_id=companies[1].id,
                username=f"other-{suffix}",
                password_hash=passwords.hash(password),
                role="admin",
            )
        )
        slug = companies[0].slug
        session.commit()
    with make_client() as client:

        def login(name):
            pair = client.post(
                "/api/v1/auth/login", data={"username": name, "password": password}
            ).json()
            return {"Authorization": "Bearer " + pair["access_token"]}

        admin, seller, viewer, other = [
            login(f"{role}-{suffix}") for role in ("admin", "seller", "viewer", "other")
        ]
        catalog = "/api/v1/crm/catalog"
        result = client.post(
            catalog + "/complexes", headers=admin, json={"name": "Chinor"}
        )
        assert result.status_code == 201
        complex_id = result.json()["id"]
        assert (
            client.put(
                f"{catalog}/complexes/{complex_id}",
                headers=admin,
                json={"name": "Chinor bog‘i"},
            ).status_code
            == 200
        )
        assert (
            client.get(f"{catalog}/complexes/{complex_id}", headers=other).status_code
            == 404
        )
        apartment = client.post(
            catalog + "/apartments",
            headers=admin,
            json={
                "complex_id": complex_id,
                "number": "12",
                "rooms": 2,
                "price_uzs": 800000000,
            },
        ).json()
        aid = apartment["id"]
        assert (
            client.patch(
                f"{catalog}/apartments/{aid}",
                headers=admin,
                json={"number": "13", "rooms": 3},
            ).status_code
            == 200
        )
        assert (
            client.post(
                catalog + "/complexes", headers=seller, json={"name": "Denied"}
            ).status_code
            == 403
        )
        leads = []
        for name in ("Aziz Karimov", "Malika Tursunova"):
            response = client.post(
                f"/api/v1/companies/{slug}/arizalar",
                json={
                    "full_name": name,
                    "phone": "+998901234567",
                    "apartment_id": aid,
                    "consent": True,
                },
            )
            assert response.status_code == 201
            leads.append(response.json()["id"])
        for lid in leads:
            route = f"/api/v1/crm/arizalar/{lid}"
            assert (
                client.patch(
                    route + "/stage",
                    headers=viewer,
                    json={"stage": "contacted", "expected_version": 1},
                ).status_code
                == 403
            )
            assert client.get(route, headers=other).status_code == 404
            for version, stage in ((1, "contacted"), (2, "viewing")):
                assert (
                    client.patch(
                        route + "/stage",
                        headers=seller,
                        json={"stage": stage, "expected_version": version},
                    ).status_code
                    == 200
                )
        sale = f"/api/v1/crm/arizalar/{leads[0]}/confirm-sale"
        assert (
            client.post(sale, headers=viewer, json={"expected_version": 3}).status_code
            == 403
        )
        assert (
            client.post(sale, headers=seller, json={"expected_version": 1}).status_code
            == 409
        )
        assert (
            client.post(sale, headers=seller, json={"expected_version": 3}).json()[
                "stage"
            ]
            == "won"
        )
        assert (
            client.post(sale, headers=seller, json={"expected_version": 3}).status_code
            == 409
        )
        assert (
            client.post(
                f"/api/v1/crm/arizalar/{leads[1]}/confirm-sale",
                headers=seller,
                json={"expected_version": 3},
            ).status_code
            == 409
        )
        assert (
            client.get(f"{catalog}/apartments/{aid}", headers=admin).json()[
                "availability"
            ]
            == "sold"
        )
        assert (
            client.delete(f"{catalog}/apartments/{aid}", headers=admin).status_code
            == 409
        )
        assert (
            client.delete(
                f"{catalog}/complexes/{complex_id}", headers=admin
            ).status_code
            == 409
        )
        assert client.get("/api/v1/crm/audit", headers=viewer).status_code == 403
        assert any(
            x["action"] == "sale.confirmed"
            for x in client.get("/api/v1/crm/audit?limit=100", headers=admin).json()
        )
        empty_complex = client.post(
            catalog + "/complexes", headers=admin, json={"name": "Vaqtinchalik"}
        ).json()["id"]
        empty_apt = client.post(
            catalog + "/apartments",
            headers=admin,
            json={
                "complex_id": empty_complex,
                "number": "1",
                "rooms": 1,
                "price_uzs": 1,
            },
        ).json()["id"]
        price = f"/api/v1/crm/inventory/apartments/{empty_apt}/price"
        assert (
            client.patch(
                price, headers=admin, json={"price_uzs": 2, "expected_price_uzs": 9}
            ).status_code
            == 409
        )
        assert (
            client.patch(
                price, headers=admin, json={"price_uzs": 2, "expected_price_uzs": 1}
            ).status_code
            == 200
        )
        assert (
            client.delete(
                f"{catalog}/apartments/{empty_apt}", headers=admin
            ).status_code
            == 204
        )
        assert (
            client.delete(
                f"{catalog}/complexes/{empty_complex}", headers=admin
            ).status_code
            == 204
        )
        # Two separate requests compete for the same apartment row lock.
        race_apt = client.post(
            catalog + "/apartments",
            headers=admin,
            json={
                "complex_id": complex_id,
                "number": "race",
                "rooms": 2,
                "price_uzs": 42,
            },
        ).json()["id"]
        race_leads = []
        for name in ("Birinchi Sinov", "Ikkinchi Sinov"):
            lid = client.post(
                f"/api/v1/companies/{slug}/arizalar",
                json={
                    "full_name": name,
                    "phone": "+998901234567",
                    "apartment_id": race_apt,
                    "consent": True,
                },
            ).json()["id"]
            for version, stage in ((1, "contacted"), (2, "viewing")):
                assert (
                    client.patch(
                        f"/api/v1/crm/arizalar/{lid}/stage",
                        headers=seller,
                        json={"stage": stage, "expected_version": version},
                    ).status_code
                    == 200
                )
            race_leads.append(lid)

        def sell(lid):
            return client.post(
                f"/api/v1/crm/arizalar/{lid}/confirm-sale",
                headers=seller,
                json={"expected_version": 3},
            ).status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(sell, race_leads)) == [200, 409]
        assert client.post("/api/v1/auth/logout-all", headers=seller).status_code == 204
        assert client.get("/api/v1/auth/me", headers=seller).status_code == 401
