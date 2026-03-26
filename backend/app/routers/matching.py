"""
============================================================
routers/matching.py — Match Search Endpoint
============================================================

Endpoints:
  GET /api/matching/results  — Get top N matches for current user
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from app.models.schemas import MatchResult
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db
from app.services.matching_engine import rank_matches

router = APIRouter()


@router.get("/results", response_model=List[MatchResult])
async def get_matches(
    top_n: int = Query(20, ge=1, le=50),
    current_uid: str = Depends(get_current_user),
):
    """
    Compute and return the top N matches for the authenticated user.

    Flow:
      1. Fetch the seeker's full profile from Firestore
      2. Fetch all other user profiles
      3. Run the matching engine
      4. Return sorted results

    Query params:
      top_n: How many matches to return (default 20, max 50)
    """
    db = get_db()

    # ── 1. Fetch seeker's profile ────────────────────────────
    seeker_doc = db.collection("users").document(current_uid).get()
    if not seeker_doc.exists:
        raise HTTPException(status_code=404, detail="Your profile was not found.")

    seeker_data = seeker_doc.to_dict()
    seeker_profile = seeker_data.get("profile", {})
    seeker_profile["uid"] = current_uid

    # Seeker must have vibe scores before they can search
    if not seeker_profile.get("vibe_scores"):
        raise HTTPException(
            status_code=400,
            detail="Please complete your lifestyle questionnaire before searching for matches."
        )

    # ── 2. Fetch all candidate profiles ─────────────────────
    # Note: In production with many users, paginate this query.
    # For hackathon scale this is fine.
    all_docs = db.collection("users").stream()

    candidates = []
    for doc in all_docs:
        if doc.id == current_uid:
            continue  # Skip self

        data = doc.to_dict()
        profile = data.get("profile", {})
        profile["uid"] = doc.id
        profile["display_name"] = data.get("displayName", "Anonymous")
        profile["photo_url"] = data.get("photoURL")
        candidates.append(profile)

    # ── 3. Rank matches ──────────────────────────────────────
    results = rank_matches(seeker_profile, candidates, top_n=top_n)

    return results
