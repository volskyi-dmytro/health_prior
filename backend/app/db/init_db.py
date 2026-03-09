from app.db.database import engine, Base, AsyncSessionLocal
from app.db import models  # noqa: F401 — imports models for metadata


async def seed_policies(session):
    """Seed the policies table with built-in policy data if not already present."""
    from sqlalchemy import text
    from app.data.molina_mcr621_criteria import MOLINA_MCR621

    result = await session.execute(
        text("SELECT id FROM policies WHERE id = :id"),
        {"id": "MCR-621"},
    )
    if result.fetchone() is None:
        await session.execute(
            text("""
                INSERT INTO policies (id, payer, procedure_name, cpt_code, criteria)
                VALUES (:id, :payer, :procedure_name, :cpt_code, cast(:criteria as jsonb))
            """),
            {
                "id": "MCR-621",
                "payer": "Molina Healthcare",
                "procedure_name": MOLINA_MCR621["policy_name"],
                "cpt_code": MOLINA_MCR621["procedure"]["cpt_codes"][0],
                "criteria": __import__("json").dumps(MOLINA_MCR621),
            },
        )
        await session.commit()


async def init_db():
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent column migration — safe to run against existing databases
        await conn.execute(text(
            "ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS session_id TEXT"
        ))

    async with AsyncSessionLocal() as session:
        await seed_policies(session)
