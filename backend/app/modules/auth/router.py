from datetime import timedelta
from typing import Annotated
from uuid import uuid4

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, SecretStr
from sqlmodel import select

from app.core.config import settings
from app.core.db import SessionDep
from app.core.security import passwords
from app.identity import RefreshSession, User
from app.models import now

dummy_hash = passwords.hash("not-a-user-password")
oauth = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def issue(user, *, expires=None):
    return jwt.encode(
        {
            "sub": str(user.id),
            "ver": user.credential_version,
            "iss": "construction-crm",
            "aud": "crm-api",
            "jti": uuid4().hex,
            "iat": now(),
            "exp": expires or now() + timedelta(minutes=settings().access_minutes),
        },
        settings().jwt_secret.get_secret_value(),
        algorithm="HS256",
    )


class RefreshRequest(BaseModel):
    refresh_token: SecretStr = Field(min_length=1, max_length=4096)


def make_refresh(user: User, login_session: RefreshSession) -> str:
    return jwt.encode(
        {
            "sub": str(user.id),
            "sid": login_session.id,
            "gen": login_session.generation,
            "ver": user.credential_version,
            "iss": "construction-crm",
            "aud": "crm-refresh",
            "iat": now(),
            "exp": login_session.expires_at,
        },
        settings().jwt_secret.get_secret_value(),
        algorithm="HS256",
    )


def decode_refresh(token: str) -> dict:
    try:
        claims = jwt.decode(
            token,
            settings().jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            audience="crm-refresh",
            issuer="construction-crm",
            options={
                "require": ["sub", "sid", "gen", "ver", "iat", "exp", "iss", "aud"]
            },
        )
        if (
            not isinstance(claims["sid"], str)
            or len(claims["sid"]) != 32
            or type(claims["gen"]) is not int
            or (type(claims["ver"]) is not int)
            or (not isinstance(claims["sub"], str))
            or (not claims["sub"].isdigit())
        ):
            raise ValueError("invalid claims")
        return claims
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise unauthorized() from None


def token_pair(user: User, login_session: RefreshSession) -> dict:
    return {
        "access_token": issue(user),
        "refresh_token": make_refresh(user, login_session),
        "token_type": "bearer",
    }


def unauthorized():
    return HTTPException(
        401, "Kirish ma’lumoti yaroqsiz", headers={"WWW-Authenticate": "Bearer"}
    )


async def current_user(
    token: Annotated[str, Depends(oauth)], session: SessionDep
) -> User:
    try:
        claims = jwt.decode(
            token,
            settings().jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            audience="crm-api",
            issuer="construction-crm",
            options={"require": ["sub", "exp", "iat", "iss", "aud", "jti", "ver"]},
        )
        user = await session.get(User, int(claims["sub"]))
        if user is None or not user.active or claims["ver"] != user.credential_version:
            raise unauthorized()
        return user
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise unauthorized() from None


UserDep = Annotated[User, Depends(current_user)]
PERMISSIONS = {
    "admin": {
        "leads:read",
        "leads:write",
        "inventory:write",
        "users:manage",
        "audit:read",
    },
    "seller": {"leads:read", "leads:write"},
    "viewer": {"leads:read"},
}


def require_permission(permission: str):

    def check(user: UserDep):
        if permission not in PERMISSIONS.get(user.role, set()):
            raise HTTPException(403, "Bu amal uchun ruxsat yo‘q")
        return user

    return check


@router.get("/me")
def me(user: UserDep):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "company_id": user.company_id,
        "permissions": sorted(PERMISSIONS[user.role]),
    }


def require_write(user: UserDep):
    if "leads:write" not in PERMISSIONS.get(user.role, set()):
        raise HTTPException(403, "Yozish ruxsati yo‘q")
    return user


WriterDep = Annotated[User, Depends(require_write)]


@router.post("/login")
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
    response: Response,
):
    user = (
        await session.exec(select(User).where(User.username == form.username.lower()))
    ).first()
    if not 1 <= len(form.password) <= 128 or len(form.username) > 80:
        raise unauthorized()
    valid = passwords.verify(form.password, user.password_hash if user else dummy_hash)
    if not valid or user is None or (not user.active):
        raise unauthorized()
    login_session = RefreshSession(
        id=uuid4().hex, user_id=user.id, expires_at=now() + timedelta(days=7)
    )
    session.add(login_session)
    await session.flush()
    pair = token_pair(user, login_session)
    await session.commit()
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return pair


@router.post("/refresh")
async def refresh(data: RefreshRequest, session: SessionDep, response: Response):
    claims = decode_refresh(data.refresh_token.get_secret_value())
    login_session = (
        await session.exec(
            select(RefreshSession)
            .where(RefreshSession.id == claims["sid"])
            .with_for_update()
        )
    ).first()
    if login_session is None or login_session.user_id != int(claims["sub"]):
        raise unauthorized()
    if login_session.revoked or login_session.expires_at <= now():
        raise unauthorized()
    user = await session.get(User, login_session.user_id)
    if user is None or not user.active or user.credential_version != claims["ver"]:
        raise unauthorized()
    if login_session.generation != claims["gen"]:
        login_session.revoked = True
        session.add(login_session)
        await session.commit()
        raise unauthorized()
    login_session.generation += 1
    session.add(login_session)
    await session.flush()
    pair = token_pair(user, login_session)
    await session.commit()
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return pair


@router.post("/logout-all", status_code=204)
async def logout_all(user: UserDep, session: SessionDep):
    user.credential_version += 1
    session.add(user)
    await session.commit()
