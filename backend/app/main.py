from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import notes, coverage, prior_auth, policies
from app.auth.router import router as auth_router
from app.auth.session import require_auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB schema
    if not settings.TESTING:
        from app.db.init_db import init_db
        await init_db()
    yield


app = FastAPI(
    title="HealthPrior API",
    version="1.0.0",
    description="Clinical note structuring and prior authorization AI prototype",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router — unprotected
app.include_router(auth_router)

# Protected routers
app.include_router(notes.router, dependencies=[Depends(require_auth)])
app.include_router(coverage.router, dependencies=[Depends(require_auth)])
app.include_router(prior_auth.router, dependencies=[Depends(require_auth)])
app.include_router(policies.router, dependencies=[Depends(require_auth)])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "healthprior-backend", "version": "1.0.0"}
