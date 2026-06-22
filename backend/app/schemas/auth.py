from pydantic import BaseModel
from uuid import UUID


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccountOut(BaseModel):
    id: UUID
    email: str
    role: str
    gm_skip_confirmation: bool

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    gm_skip_confirmation: bool
