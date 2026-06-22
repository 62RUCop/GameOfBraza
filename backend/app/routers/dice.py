from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.compute import roll_dice
from app.schemas.catalogs import DiceRollRequest, DiceRollResponse

router = APIRouter(prefix="/dice", tags=["dice"])

VALID_FACES = {4, 6, 8, 10, 12, 20, 60, 100}


@router.post("/roll", response_model=DiceRollResponse)
async def roll(body: DiceRollRequest, _=Depends(get_current_user)):
    if body.faces not in VALID_FACES:
        raise HTTPException(status_code=422, detail=f"faces must be one of {sorted(VALID_FACES)}")
    return DiceRollResponse(result=roll_dice(body.faces), faces=body.faces)
