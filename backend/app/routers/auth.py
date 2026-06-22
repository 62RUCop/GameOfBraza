from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.account import Account
from app.schemas.auth import AccountOut, LoginRequest, ProfileUpdate, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.email == body.email))
    account = result.scalar_one_or_none()
    if not account or not verify_password(body.password, account.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(str(account.id), account.role),
        refresh_token=create_refresh_token(str(account.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        account_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(Account).where(Account.id == UUID(account_id)))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=401, detail="Account not found")

    return TokenResponse(
        access_token=create_access_token(str(account.id), account.role),
        refresh_token=create_refresh_token(str(account.id)),
    )


@router.get("/me", response_model=AccountOut)
async def me(current_user: Account = Depends(get_current_user)):
    return current_user


@router.patch("/accounts/{account_id}/profile", response_model=AccountOut)
async def update_profile(
    account_id: UUID,
    body: ProfileUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id != account_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.gm_skip_confirmation = body.gm_skip_confirmation
    return account
