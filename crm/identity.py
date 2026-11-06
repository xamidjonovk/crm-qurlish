from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime
from sqlmodel import Field, SQLModel

from .models import now


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('admin','seller','viewer')", name="ck_user_role"),)
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    username: str = Field(unique=True, max_length=80)
    password_hash: str
    role: str = Field(default="seller", max_length=20)
    active: bool = True
    credential_version: int = 1


class Audit(SQLModel, table=True):
    __tablename__ = "audit"
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    actor_id: int = Field(foreign_key="users.id", index=True)
    action: str = Field(max_length=60)
    resource_id: int
    created_at: datetime = Field(
        default_factory=now, sa_column=Column(DateTime(timezone=True), nullable=False)
    )


class RefreshSession(SQLModel, table=True):
    __tablename__ = "refresh_sessions"
    id: str = Field(primary_key=True, max_length=32)
    user_id: int = Field(foreign_key="users.id", index=True)
    generation: int = 0
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    revoked: bool = False
