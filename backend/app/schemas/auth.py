import uuid
from typing import Optional, List
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)
    client_mode: Optional[str] = "staff"  # "guardian" or "staff"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str


class RoleMembershipSchema(BaseModel):
    school_id: uuid.UUID
    school_name: str
    role: str
    is_active: bool


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    active_role: str
    active_school_id: uuid.UUID
    roles: List[str]
    memberships: List[RoleMembershipSchema]
    landing_route: str


class LoginResponse(BaseModel):
    token: TokenResponse
    user: UserProfileResponse


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
