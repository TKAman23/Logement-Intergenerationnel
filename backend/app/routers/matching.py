"""
============================================================
routers/matching.py — Match Search Endpoint
============================================================

Endpoints:
  GET /api/matching/results  — Get top N matches for current user

Key fixes:
  - vibe_scores check now correctly reads from the profile sub-dict
  - Only returns opposite-role candidates (elder ↔ youth)
  - Location proximity: candidates whose location string shares
    words with the seeker's location are ranked higher via a
    bonus subtracted from their match score
"""

from inspect import isawaitable
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from app.models.schemas import MatchResult
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db
from app.services.matching_engine import rank_matches

router = APIRouter()


def _location_overlap(loc_a: str, loc_b: str) -> float:
    """
    Return a proximity bonus (0.0–1.0) based on word overlap between
    two free-text location strings. Case-insensitive.
    E.g. "Plateau-Mont-Royal, Montréal" vs "Montréal" → 0.5+
    """
    if not loc_a or not loc_b:
        return 0.0
    words_a = set(loc_a.lower().replace(',', ' ').split())
    words_b = set(loc_b.lower().replace(',', ' ').split())
    # Remove very short/common words that add noise
    stopwords = {'the', 'le', 'la', 'les', 'de', 'du', 'a', 'an', 'in', 'en', 'and', 'et'}
    words_a -= stopwords
    words_b -= stopwords
    if not words_a or not words_b:
        return 0.0
    overlap = len(words_a & words_b) / max(len(words_a), len(words_b))
    return overlap


@router.get("/results", response_model=List[MatchResult])
async def get_matches(
    top_n: int = Query(20, ge=1, le=50),
    current_uid: str = Depends(get_current_user),
):
    """
    Compute and return the top N matches for the authenticated user.

    Only returns candidates of the OPPOSITE role:
      - Elder seekers see only Youth candidates
      - Youth seekers see only Elder candidates

    Location proximity is used as a ranking bonus: candidates whose
    free-text location overlaps with the seeker's get a score reduction
    (making them appear higher), proportional to word overlap.
    """
    db = get_db()

    # ── 1. Fetch seeker's profile ────────────────────────────
    seeker_doc = db.collection("users").document(current_uid).get()
    seeker_doc = await seeker_doc if isawaitable(seeker_doc) else seeker_doc
    if not seeker_doc.exists:
        raise HTTPException(status_code=404, detail="Your profile was not found.")

    seeker_data = seeker_doc.to_dict() or {}
    seeker_profile = seeker_data.get("profile", {})
    seeker_profile["uid"] = current_uid
    seeker_profile["display_name"] = seeker_data.get("displayName", "")

    # ── 2. Check seeker has vibe scores ─────────────────────
    # vibe_scores lives inside the profile dict — check there specifically
    vibe_scores = seeker_profile.get("vibe_scores")
    if not vibe_scores:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please complete your lifestyle questionnaire and click "
                "'Analyze My Answers', then save your profile before searching."
            )
        )

    seeker_role = seeker_profile.get("role", "youth")
    seeker_location = seeker_profile.get("location", "")

    # Determine what the opposite role is
    # Elders see youth; youth see elders
    opposite_role = "youth" if seeker_role == "elder" else "elder"

    # ── 3. Fetch candidates of opposite role only ────────────
    all_docs = db.collection("users").stream()

    candidates = []
    for doc in all_docs:
        if doc.id == current_uid:
            continue  # Skip self

        data = doc.to_dict() or {}
        profile = data.get("profile", {})

        # Skip if wrong role
        candidate_role = profile.get("role", "youth")
        if candidate_role != opposite_role:
            continue

        # Skip if no vibe scores (incomplete profile)
        if not profile.get("vibe_scores"):
            continue

        profile["uid"] = doc.id
        profile["display_name"] = data.get("displayName", "Anonymous")
        profile["photo_url"] = data.get("photoURL")

        # ── Location proximity bonus ─────────────────────────
        # Compute overlap between seeker location and candidate location.
        # Stored as a field on the profile dict so matching_engine can use it.
        candidate_location = profile.get("location", "")
        overlap = _location_overlap(seeker_location, candidate_location)
        # Store as a pre-computed bonus the engine will subtract from score
        profile["_location_bonus"] = overlap * 0.6  # Max 0.6 point reduction

        candidates.append(profile)

    # ── 4. Rank matches ──────────────────────────────────────
    results = rank_matches(seeker_profile, candidates, top_n=top_n)

    return results

