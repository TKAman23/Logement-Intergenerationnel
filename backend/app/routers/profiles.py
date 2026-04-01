"""
============================================================
routers/profiles.py — Profile CRUD + NLP Scoring Endpoints
============================================================

Endpoints:
  GET    /api/profiles/{uid}       — Fetch a user's profile
  PATCH  /api/profiles/{uid}       — Update a user's profile
  POST   /api/profiles/score       — Score lifestyle answers → VibeScores
  DELETE /api/profiles/{uid}       — Delete profile (account teardown)
"""

from inspect import isawaitable
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import UserProfile, ProfileUpdateRequest, ScoreRequest, VibeScores
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db
from app.services.vibe_scorer import VibeScorer

router = APIRouter()


@router.get("/{uid}", response_model=UserProfile)
async def get_profile(uid: str, current_uid: str = Depends(get_current_user)):
    """
    Fetch a user's profile from Firestore.
    Any authenticated user can view any profile (for match browsing).
    """
    db = get_db()
    doc = db.collection("users").document(uid).get()
    doc = await doc if isawaitable(doc) else doc  # Handle both sync and async Firestore clients

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found.")

    data = doc.to_dict()
    # Return only the profile sub-document
    return data.get("profile", {}) if data else {}


@router.patch("/{uid}", response_model=dict)
async def update_profile(
    uid: str,
    body: ProfileUpdateRequest,
    current_uid: str = Depends(get_current_user),
):
    """
    Update a user's profile in Firestore.
    Users can only update their own profile.
    """
    # Authorization: only allow editing your own profile
    if current_uid != uid:
        raise HTTPException(status_code=403, detail="Cannot edit another user's profile.")

    db = get_db()
    profile_data = body.profile.model_dump()

    # Use Firestore merge to avoid overwriting other fields (like vibe_scores)
    db.collection("users").document(uid).set(
        {"profile": profile_data},
        merge=True
    )

    return {"success": True, "uid": uid}


@router.post("/score", response_model=VibeScores)
async def score_lifestyle_answers(
    body: ScoreRequest,
    current_uid: str = Depends(get_current_user),
):
    """
    Run the HuggingFace NLP pipeline on the user's lifestyle answers
    and return computed VibeScores. The frontend should save these
    back to the user's profile via PATCH /profiles/{uid}.

    This is a separate endpoint so the frontend can show a
    loading state while models run, without blocking profile saves.
    """
    scorer = VibeScorer.get_instance()

    # Convert Pydantic model to plain dict for the scorer
    answers_dict = body.lifestyle_answers.model_dump()

    # Run NLP scoring
    scores_dict = scorer.score_answers(answers_dict)

    return VibeScores(**scores_dict)
