from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, characters, equipment, skills, backpack, currency, reputation, pet, class_bonus, dice, images, campaigns, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import AsyncSessionLocal
    from app.core import rule_config
    async with AsyncSessionLocal() as session:
        await rule_config.load_from_db(session)
    from app.core.s3 import ensure_bucket_exists
    try:
        ensure_bucket_exists()
    except Exception:
        pass
    yield


app = FastAPI(
    title="GameOfBraza API",
    description="REST API for the GameOfBraza TRPG character sheet system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(characters.router)
app.include_router(equipment.router)
app.include_router(skills.router)
app.include_router(backpack.router)
app.include_router(currency.router)
app.include_router(reputation.router)
app.include_router(pet.router)
app.include_router(class_bonus.router)
app.include_router(dice.router)
app.include_router(images.router)
app.include_router(campaigns.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "GameOfBraza API", "docs": "/docs"}
