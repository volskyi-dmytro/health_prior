from app.db.database import engine, Base
from app.db import models  # noqa: F401 — imports model for metadata

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
