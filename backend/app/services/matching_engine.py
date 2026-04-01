"""
============================================================
services/matching_engine.py — Match Scoring & Ranking
============================================================

Given a requester's profile and a pool of candidate profiles,
computes a match score for each candidate and returns the top N.

Match Score Formula (lower = better match):
  score = Σ |seeker_vibe[i] - candidate_vibe[i]| * vibe_weight[i]
         + rent_penalty
         + location_penalty
         + lifestyle_penalty (pets, smoking)
         - interest_bonus
         - commitment_proximity_bonus

Final result is sorted ascending by score.
"""

from typing import List, Dict, Any
from app.models.schemas import MatchResult


# ── Dimension Weights ────────────────────────────────────────
# How much each vibe dimension contributes to the total score.
# Values should sum to 1.0 for normalized scoring.
# Adjust these to tune matching priority.
VIBE_WEIGHTS: Dict[str, float] = {
    "introvert_extrovert": 0.15,
    "quiet_energetic":     0.15,
    "friendliness":        0.10,
    "assertiveness":       0.10,
    "empathy":             0.10,
    "inquisitiveness":     0.10,
    "noisiness":           0.15,
    "early_night":         0.15,
}

# Maximum rent penalty contribution (normalized)
RENT_WEIGHT = 0.5

# Bonus per shared interest
INTEREST_BONUS_PER = 0.05

# Max total interest bonus (cap so interests don't dominate)
MAX_INTEREST_BONUS = 0.3

# Penalty for lifestyle mismatches
PET_MISMATCH_PENALTY = 0.4
SMOKING_MISMATCH_PENALTY = 0.5


def compute_match_score(
    seeker: Dict[str, Any],
    candidate: Dict[str, Any],
) -> tuple[float, Dict[str, float]]:
    """
    Compute a match distance score between two profiles.
    Returns (total_score, breakdown_dict).
    Lower score = better match.

    Parameters:
        seeker:    Profile dict of the user requesting matches
        candidate: Profile dict of the candidate being scored
    """
    breakdown: Dict[str, float] = {}

    # ── 1. Vibe Score Distance ───────────────────────────────
    # Compare seeker's preferences against candidate's actual vibes.
    # Uses seeker's vibe_preferences (what they want) vs candidate's vibe_scores (who they are).
    seeker_prefs = seeker.get("vibe_preferences") or {}
    candidate_vibes = candidate.get("vibe_scores") or {}

    vibe_total = 0.0
    for dim, weight in VIBE_WEIGHTS.items():
        seeker_val    = seeker_prefs.get(dim, 0.5)
        candidate_val = candidate_vibes.get(dim, 0.5)
        diff = abs(seeker_val - candidate_val)
        weighted = diff * weight
        vibe_total += weighted
        breakdown[f"vibe_{dim}"] = round(weighted, 4)

    breakdown["vibe_total"] = round(vibe_total, 4)

    # ── 2. Rent Penalty ──────────────────────────────────────
    # Compare what elder offers vs what youth is willing to pay.
    # We need to figure out who is the elder/youth in this pair.
    seeker_role    = seeker.get("role", "either")
    candidate_role = candidate.get("role", "either")

    rent_penalty = _compute_rent_penalty(seeker, candidate, seeker_role, candidate_role)
    breakdown["rent_penalty"] = round(rent_penalty, 4)

    # ── 3. Location Bonus ────────────────────────────────────
    # The router pre-computed a _location_bonus based on free-text
    # word overlap between seeker and candidate locations.
    # A higher overlap = lower score = better match position.
    location_penalty = -candidate.get("_location_bonus", 0.0)
    breakdown["location_score"] = round(location_penalty, 4)

    # ── 4. Lifestyle Penalties ───────────────────────────────
    lifestyle_penalty = 0.0

    # Pet mismatch: one wants pets, other doesn't
    if seeker.get("pets") != candidate.get("pets"):
        lifestyle_penalty += PET_MISMATCH_PENALTY
        breakdown["pet_penalty"] = PET_MISMATCH_PENALTY
    else:
        breakdown["pet_penalty"] = 0.0

    # Smoking mismatch
    if seeker.get("smoking") != candidate.get("smoking"):
        lifestyle_penalty += SMOKING_MISMATCH_PENALTY
        breakdown["smoking_penalty"] = SMOKING_MISMATCH_PENALTY
    else:
        breakdown["smoking_penalty"] = 0.0

    # ── 5. Interest Overlap Bonus (subtract from score) ──────
    seeker_interests    = set(seeker.get("interests", []))
    candidate_interests = set(candidate.get("interests", []))
    shared = seeker_interests & candidate_interests
    interest_bonus = min(len(shared) * INTEREST_BONUS_PER, MAX_INTEREST_BONUS)
    breakdown["interest_bonus"] = round(interest_bonus, 4)

    # ── 6. Commitment Hours Proximity Bonus ──────────────────
    seeker_hours    = seeker.get("commitment_hours", 5)
    candidate_hours = candidate.get("commitment_hours", 5)
    hour_diff = abs(seeker_hours - candidate_hours)
    # Normalize by 20 hours max difference; smaller diff = smaller penalty
    commitment_penalty = min(hour_diff / 20.0, 1.0) * 0.2
    breakdown["commitment_penalty"] = round(commitment_penalty, 4)

    # ── Total Score ──────────────────────────────────────────
    total = (
        vibe_total
        + rent_penalty
        + location_penalty
        + lifestyle_penalty
        + commitment_penalty
        - interest_bonus   # Bonus reduces score
    )
    total = max(0.0, total)  # Floor at 0
    breakdown["total"] = round(total, 4)

    return total, breakdown


def _compute_rent_penalty(
    seeker: Dict, candidate: Dict,
    seeker_role: str, candidate_role: str
) -> float:
    """
    Compute a normalized rent compatibility penalty.
    Compares the elder's offered rent against the youth's budget.
    """
    # Determine who offers (elder) and who pays (youth)
    if seeker_role == "elder":
        offered = seeker.get("rent_offer")
        budget  = candidate.get("rent_budget")
    elif seeker_role == "youth":
        offered = candidate.get("rent_offer")
        budget  = seeker.get("rent_budget")
    else:
        # "either" — try both and use the one that makes sense
        offered = candidate.get("rent_offer") or seeker.get("rent_offer")
        budget  = seeker.get("rent_budget") or candidate.get("rent_budget")

    if offered is None or budget is None:
        return 0.0  # Can't compute — no penalty

    diff = abs(offered - budget)
    # Normalize: $500 difference → 0.5 penalty; $1000+ → 1.0 penalty
    return min(diff / 1000.0, 1.0) * RENT_WEIGHT


def rank_matches(
    seeker_profile: Dict[str, Any],
    all_profiles: List[Dict[str, Any]],
    top_n: int = 20,
) -> List[MatchResult]:
    """
    Rank all candidate profiles against the seeker and return top N matches.

    Parameters:
        seeker_profile: The profile of the user requesting matches
        all_profiles:   List of all other user profiles from Firestore
        top_n:          How many top matches to return

    Returns:
        List of MatchResult objects, sorted best → worst
    """
    results = []

    for candidate in all_profiles:
        # Skip incomplete profiles (no vibe scores computed yet)
        if not candidate.get("vibe_scores"):
            continue

        # Skip profiles from same user (shouldn't happen, but just in case)
        if candidate.get("uid") == seeker_profile.get("uid"):
            continue

        score, breakdown = compute_match_score(seeker_profile, candidate)

        results.append(MatchResult(
            uid=candidate.get("uid", ""),
            display_name=candidate.get("display_name", "Anonymous"),
            bio=candidate.get("bio", ""),
            role=candidate.get("role", "either"),
            location=candidate.get("location", ""),
            rent_offer=candidate.get("rent_offer"),
            rent_budget=candidate.get("rent_budget"),
            pets=candidate.get("pets", False),
            smoking=candidate.get("smoking", False),
            interests=candidate.get("interests", []),
            languages=candidate.get("languages", []),
            commitment_hours=candidate.get("commitment_hours", 0),
            photo_url=candidate.get("photo_url"),
            match_score=score,
            score_breakdown=breakdown,
        ))

    # Sort ascending (lower score = better match)
    results.sort(key=lambda r: r.match_score)

    return results[:top_n]
