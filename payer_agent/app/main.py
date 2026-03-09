from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.agent_card import router as agent_card_router
from app.api.tasks import router as tasks_router
from app.store.task_store import task_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    await task_store.initialize()
    yield


app = FastAPI(title="HealthPrior Payer Agent", version="1.0.0", lifespan=lifespan)

# Agent discovery endpoint — no prefix (path is /.well-known/agent.json)
app.include_router(agent_card_router)

# Task management endpoints
app.include_router(tasks_router, prefix="/tasks")
