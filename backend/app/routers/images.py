import io
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.s3 import upload_bytes
from app.database import get_db
from app.models.account import Account
from app.models.character import Character
from app.schemas.catalogs import ImageUploadResponse
from app.services import character_service

router = APIRouter(prefix="/characters/{character_id}/images", tags=["images"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
MAX_SIZE_BYTES = 5 * 1024 * 1024


@router.post("", response_model=ImageUploadResponse)
async def upload_image(
    character_id: UUID,
    file: UploadFile = File(...),
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="Only JPEG and PNG images are allowed")

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=422, detail="Image exceeds 5 MB limit")

    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    timestamp = int(datetime.now(timezone.utc).timestamp())
    key = f"characters/{character_id}/portrait_{timestamp}.{ext}"
    thumb_key = f"characters/{character_id}/portrait_{timestamp}_thumb.{ext}"

    try:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        img.thumbnail((256, 256))
        thumb_buf = io.BytesIO()
        img.save(thumb_buf, format="JPEG" if ext == "jpg" else "PNG")
        thumb_data = thumb_buf.getvalue()

        image_url = upload_bytes(key, data, file.content_type)
        thumb_url = upload_bytes(thumb_key, thumb_data, file.content_type)
    except Exception:
        image_url = f"/images/{key}"
        thumb_url = f"/images/{thumb_key}"

    res = await db.execute(select(Character).where(Character.id == character_id))
    char = res.scalar_one_or_none()
    if char:
        char.appearance_image_url = thumb_url

    return ImageUploadResponse(image_url=image_url, thumb_url=thumb_url)
