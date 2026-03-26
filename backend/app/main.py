"""
============================================================
main.py — FastAPI Application Entry Point
Logement Intergénérationnel Backend
============================================================

This file initializes the FastAPI app, registers all routers,
configures CORS, and sets up Firebase on startup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.utils.firebase_admin import initialize_firebase
from app.routers import accounts, profiles, matching, connections


# ── Lifespan: runs on startup and shutdown ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: initialize Firebase Admin SDK and pre-load NLP models.
    Shutdown: clean up any resources if needed.
    """
    print("🔥 Initializing Firebase Admin SDK...")
    initialize_firebase()

    # Pre-load the NLP models into memory so the first request isn't slow.
    # Import here to trigger model loading at startup.
    print("🤖 Pre-loading HuggingFace NLP models (this may take a moment)...")
    from app.services.vibe_scorer import VibeScorer
    VibeScorer.get_instance()  # Singleton — loads models once
    print("✅ Models loaded. Server ready.")

    yield  # App runs here

    print("👋 Shutting down.")


# ── App Initialization ──────────────────────────────────────
app = FastAPI(
    title="Logement Intergénérationnel API",
    description="Matching API for intergenerational housing platform",
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS Middleware ─────────────────────────────────────────
# Allow requests from the React frontend (dev + prod origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,   # List from .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register Routers ────────────────────────────────────────
# Each router handles a logical group of endpoints.
app.include_router(accounts.router,    prefix="/api/accounts",    tags=["Accounts"])
app.include_router(profiles.router,    prefix="/api/profiles",    tags=["Profiles"])
app.include_router(matching.router,    prefix="/api/matching",    tags=["Matching"])
app.include_router(connections.router, prefix="/api/connections", tags=["Connections"])


# ── Health Check ────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """Simple health check endpoint — useful for Render's uptime checks."""
    return {"status": "ok", "service": "logement-intergenerationnel-api"}
