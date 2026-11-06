import os
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.engine import make_url
from sqlmodel import Session
from test_api import make_client

from app.core.db import engine
from app.core.security import passwords
from app.identity import User
from app.models import Company
from app.modules.residence.schemas import ApartmentPlacement, BuildingInput


@pytest.mark.parametrize(
    "field,value",
    [
        ("interior_url", "javascript:alert(1)"),
        ("floor_plan_url", "http://insecure/image.png"),
        ("interior_url", "//foreign.example/a.png"),
        ("interior_url", "/assets/../secret"),
        ("floor", 0),
        ("position", 12),
        ("facade", "unknown"),
        ("area_m2", float("nan")),
    ],
)
def test_visual_metadata_rejects_invalid_values(field, value):
    with pytest.raises(ValidationError):
        ApartmentPlacement(**{field: value})


def test_building_and_media_validation():
    with pytest.raises(ValidationError):
        BuildingInput(name=" ")
    with pytest.raises(ValidationError):
        BuildingInput(name="A", x=float("inf"))
    assert ApartmentPlacement(
        interior_url="/assets/residence/interior-sample.webp"
    ).interior_url
    assert ApartmentPlacement(
        floor_plan_url="https://example.com/plan.png"
    ).floor_plan_url


@pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"), reason="Requires disposable PostgreSQL"
)
def test_residence_tenant_boundaries_placement_and_live_inventory():
    url = make_url(os.environ["DATABASE_URL"])
    assert url == make_url(os.environ["TEST_DATABASE_URL"])
    assert url.database.startswith("course_crm_")
    suffix = uuid4().hex[:10]
    password = "residence-test-password-2026"
    with Session(engine()) as session:
        tenants = [Company(name="3D test", slug=f"res-{suffix}-{i}") for i in range(2)]
        session.add_all(tenants)
        session.flush()
        for role in ("admin", "seller", "viewer", "other"):
            session.add(
                User(
                    company_id=tenants[1 if role == "other" else 0].id,
                    username=f"res-{role}-{suffix}",
                    password_hash=passwords.hash(password),
                    role="admin" if role == "other" else role,
                )
            )
        slug, other_slug = [t.slug for t in tenants]
        session.commit()
    with make_client() as client:

        def login(role):
            token = client.post(
                "/api/v1/auth/login",
                data={"username": f"res-{role}-{suffix}", "password": password},
            ).json()["access_token"]
            return {"Authorization": "Bearer " + token}

        admin, seller, viewer, other = [
            login(r) for r in ("admin", "seller", "viewer", "other")
        ]
        catalog = "/api/v1/crm/catalog"
        prefix = "/api/v1/crm/residence"
        cid = client.post(
            catalog + "/complexes", headers=admin, json={"name": "Test Residence"}
        ).json()["id"]
        cid2 = client.post(
            catalog + "/complexes", headers=admin, json={"name": "Second Residence"}
        ).json()["id"]
        scene = f"{prefix}/complexes/{cid}"
        create = scene + "/buildings"
        assert client.get(scene).status_code == 401
        assert client.get(scene, headers=other).status_code == 404
        assert (
            client.get(f"/api/v1/companies/{other_slug}/residence/{cid}").status_code
            == 404
        )
        assert (
            client.post(create, headers=seller, json={"name": "Denied"}).status_code
            == 403
        )
        building = client.post(
            create, headers=admin, json={"name": "A bino", "floors": 7}
        ).json()
        bid = building["id"]
        assert (
            client.post(create, headers=admin, json={"name": "A bino"}).status_code
            == 409
        )
        values = {
            "complex_id": cid,
            "number": "A-01",
            "rooms": 2,
            "price_uzs": 800000000,
            "building_id": bid,
            "floor": 7,
            "facade": "back",
            "position": 0,
            "area_m2": 64.8,
        }
        assert (
            client.post(
                catalog + "/apartments", headers=admin, json={**values, "floor": 8}
            ).status_code
            == 422
        )
        assert (
            client.post(
                catalog + "/apartments",
                headers=admin,
                json={**values, "complex_id": cid2},
            ).status_code
            == 404
        )
        result = client.post(catalog + "/apartments", headers=admin, json=values)
        assert result.status_code == 201, result.text
        aid = result.json()["id"]
        assert (
            client.post(
                catalog + "/apartments",
                headers=admin,
                json={**values, "number": "A-02"},
            ).status_code
            == 409
        )
        assert (
            client.post(
                "/api/v1/crm/inventory/apartments",
                headers=admin,
                json={**values, "number": "A-03", "floor": 8},
            ).status_code
            == 422
        )
        building_url = f"{prefix}/buildings/{bid}"
        assert (
            client.put(
                building_url, headers=admin, json={"name": "A bino", "floors": 6}
            ).status_code
            == 409
        )
        assert client.delete(building_url, headers=admin).status_code == 409
        assert (
            client.put(building_url, headers=other, json={"name": "B"}).status_code
            == 404
        )
        for headers in (admin, seller, viewer):
            response = client.get(scene, headers=headers)
            assert response.status_code == 200
            assert response.json()["apartments"][0]["area_m2"] == 64.8
            assert response.headers["cache-control"] == "private, no-store"
            assert "company_id" not in response.json()["buildings"][0]
        public = f"/api/v1/companies/{slug}/residence/{cid}"
        assert client.get(public).json()["buildings"][0]["id"] == bid
        # Real sale workflow must appear in the next scene snapshot.
        lid = client.post(
            f"/api/v1/companies/{slug}/arizalar",
            json={
                "full_name": "Residence Test",
                "phone": "+998901234567",
                "apartment_id": aid,
                "consent": True,
            },
        ).json()["id"]
        notes = f"/api/v1/crm/arizalar/{lid}/notes"
        assert client.get(notes).status_code == 401
        assert client.get(notes, headers=other).status_code == 404
        assert client.post(notes, headers=viewer, json={"text": "test"}).status_code == 403
        assert client.post(notes, headers=seller, json={"text": "   "}).status_code == 422
        assert client.post(notes, headers=seller, json={"text": "Uchrashuv haqida eslatma"}).status_code == 201
        assert client.get(notes, headers=viewer).json()[0]["text"] == "Uchrashuv haqida eslatma"
        assert client.post(notes, headers=other, json={"text": "x"}).status_code == 404
        for version, stage in ((1, "contacted"), (2, "viewing")):
            assert (
                client.patch(
                    f"/api/v1/crm/arizalar/{lid}/stage",
                    headers=seller,
                    json={"expected_version": version, "stage": stage},
                ).status_code
                == 200
            )
        assert (
            client.post(
                f"/api/v1/crm/arizalar/{lid}/confirm-sale",
                headers=seller,
                json={"expected_version": 3},
            ).status_code
            == 200
        )
        assert client.get(public).json()["apartments"][0]["availability"] == "sold"
        assert (
            client.patch(
                f"{catalog}/apartments/{aid}", headers=admin, json={"floor": 1}
            ).status_code
            == 409
        )
        # Legacy unassigned inventory remains readable and can be placed/cleared later.
        new = client.post(
            catalog + "/apartments",
            headers=admin,
            json={"complex_id": cid, "number": "legacy", "rooms": 1, "price_uzs": 100},
        ).json()
        assert new["building_id"] is None and new["area_m2"] is None
        placement = f"{catalog}/apartments/{new['id']}"
        assert (
            client.patch(
                placement, headers=admin, json={"building_id": bid, "floor": 2}
            ).status_code
            == 200
        )
        assert (
            client.patch(
                placement, headers=admin, json={"building_id": None, "area_m2": None}
            ).status_code
            == 200
        )
        assert (
            client.patch(placement, headers=admin, json={"floor": None}).status_code
            == 422
        )
