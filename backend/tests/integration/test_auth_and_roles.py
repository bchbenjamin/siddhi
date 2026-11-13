import uuid
from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import Student, School, User, SchoolMembership

client = TestClient(app)


def test_educator_login_success():
    """Educator signs in and receives staff landing route."""
    res = client.post("/api/v1/auth/login", json={
        "email": "educator1@siddhi.test",
        "password": "SiddhiEducator2026!",
        "client_mode": "staff"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "token" in data
    assert data["user"]["active_role"] == "special_educator"
    assert data["user"]["landing_route"] == "/staff"
    assert "access_token" in data["token"]


def test_guardian_login_success():
    """Guardian signs in and receives guardian landing route."""
    res = client.post("/api/v1/auth/login", json={
        "email": "guardian.single@siddhi.test",
        "password": "SiddhiGuardian2026!",
        "client_mode": "guardian"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["active_role"] == "guardian"
    assert data["user"]["landing_route"] == "/guardian"


def test_invalid_login_generic_message():
    """Invalid password returns generic 401 without revealing account status."""
    res = client.post("/api/v1/auth/login", json={
        "email": "educator1@siddhi.test",
        "password": "WrongPassword123!",
        "client_mode": "staff"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_refresh_token_rotation():
    """Refresh token can be used to issue a new access token and is rotated."""
    login_res = client.post("/api/v1/auth/login", json={
        "email": "principal@siddhi.test",
        "password": "SiddhiHead2026!"
    })
    assert login_res.status_code == 200
    refresh_token = login_res.json()["token"]["refresh_token"]

    client_with_cookie = TestClient(app)
    client_with_cookie.cookies.set("refresh_token", refresh_token)
    refresh_res = client_with_cookie.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200
    new_token_data = refresh_res.json()
    assert "access_token" in new_token_data
    assert new_token_data["refresh_token"] != refresh_token


def test_get_current_user_me():
    """Verify /auth/me returns current user profile."""
    login_res = client.post("/api/v1/auth/login", json={
        "email": "therapist@siddhi.test",
        "password": "SiddhiTherapy2026!"
    })
    token = login_res.json()["token"]["access_token"]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_info = me_res.json()
    assert user_info["email"] == "therapist@siddhi.test"
    assert user_info["active_role"] == "therapist"


def test_inactive_account_rejected():
    """Deactivated accounts cannot authenticate."""
    db = SessionLocal()
    try:
        user = User(
            email=f"inactive-{uuid.uuid4().hex[:6]}@siddhi.test",
            password_hash="dummy-hash",
            full_name="Inactive User",
            is_active=False
        )
        db.add(user)
        db.commit()

        res = client.post("/api/v1/auth/login", json={
            "email": user.email,
            "password": "AnyPassword"
        })
        assert res.status_code == 403
        assert "inactive" in res.json()["detail"].lower()

        db.delete(user)
        db.commit()
    finally:
        db.close()
