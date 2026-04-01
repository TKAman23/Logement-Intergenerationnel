"""
============================================================
models/schemas.py — Pydantic Data Models (Schemas)
============================================================

These models define the shape of data flowing through the API.
FastAPI uses them for automatic request validation and response serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Literal
from datetime import datetime


# ── Vibe Scores ─────────────────────────────────────────────
class VibeScores(BaseModel):
    """
    Personality/lifestyle scores computed by the NLP pipeline.
    All values are floats between 0.0 and 1.0.

    Convention for each axis:
      0.0 = strongly the first trait (e.g., introvert, quiet, early bird)
      1.0 = strongly the second trait (e.g., extrovert, energetic, night owl)
    """
    introvert_extrovert: float = Field(0.5, ge=0.0, le=1.0)
    quiet_energetic: float      = Field(0.5, ge=0.0, le=1.0)
    friendliness: float         = Field(0.5, ge=0.0, le=1.0)
    assertiveness: float        = Field(0.5, ge=0.0, le=1.0)
    empathy: float              = Field(0.5, ge=0.0, le=1.0)
    inquisitiveness: float      = Field(0.5, ge=0.0, le=1.0)
    noisiness: float            = Field(0.5, ge=0.0, le=1.0)
    early_night: float          = Field(0.5, ge=0.0, le=1.0)


# ── Lifestyle Answers (free-text prompts) ───────────────────
class LifestyleAnswers(BaseModel):
    """
    Free-text answers to the 8 lifestyle prompt questions.
    These are fed into the NLP models to compute VibeScores.
    """
    q1_social: str          = ""   # "How do you prefer to spend a Friday evening?"
    q2_morning: str         = ""   # "Describe your typical morning routine."
    q3_home_energy: str     = ""   # "What does your ideal home atmosphere feel like?"
    q4_conflict: str        = ""   # "How do you handle disagreements or conflicts?"
    q5_others: str          = ""   # "How do you usually connect with new people?"
    q6_curiosity: str       = ""   # "What topics or hobbies are you passionate about?"
    q7_noise: str           = ""   # "How do you feel about noise in shared spaces?"
    q8_schedule: str        = ""   # "Are you more of a morning person or night owl? Describe your schedule."


# ── User Profile ─────────────────────────────────────────────
class UserProfile(BaseModel):
    """
    Full profile for a user, stored under users/{uid}/profile in Firestore.
    """
    # Basic info
    display_name: str = ""
    bio: str = ""
    role: Literal["elder", "youth"] = "youth"   # No more "either"
    location: str = ""                           # Free-text city/address (was Literal enum)
    languages: List[str] = []
    interests: List[str] = []

    # Housing / financial
    rent_offer: Optional[float] = None    # Elders: monthly rent charged
    rent_budget: Optional[float] = None   # Youth: max monthly rent

    # Lifestyle filters
    pets: bool = False
    smoker: bool = False        # "I smoke"
    smoking_ok: bool = False    # "I am OK with others smoking"
    smoking: bool = False       # Legacy combined field (smoker OR smoking_ok)
    commitment_hours: int = Field(5, ge=0, le=168)

    # Free-text answers → used to compute vibe_scores
    lifestyle_answers: LifestyleAnswers = LifestyleAnswers()

    # Computed by backend NLP (not entered by user directly)
    vibe_scores: Optional[VibeScores] = None

    # What the user wants in a match (entered by user with sliders)
    vibe_preferences: Optional[VibeScores] = None


# ── Profile Update Request ───────────────────────────────────
class ProfileUpdateRequest(BaseModel):
    """Payload for PATCH /api/profiles/{uid}"""
    profile: UserProfile


# ── Score Request ────────────────────────────────────────────
class ScoreRequest(BaseModel):
    """
    Payload for POST /api/profiles/score
    Sent by frontend after user fills out lifestyle answers.
    Returns computed VibeScores to save on the profile.
    """
    lifestyle_answers: LifestyleAnswers


# ── Match Result ─────────────────────────────────────────────
class MatchResult(BaseModel):
    """
    A single match returned by the matching engine.
    Includes the candidate's public profile info + their match score.
    """
    uid: str
    display_name: str
    bio: str
    role: str
    location: str
    rent_offer: Optional[float]
    rent_budget: Optional[float]
    pets: bool
    smoking: bool
    interests: List[str]
    languages: List[str]
    commitment_hours: int
    photo_url: Optional[str]

    # The computed match distance (lower = better match)
    match_score: float
    # Breakdown of how the score was computed (for transparency/UI)
    score_breakdown: Dict[str, float]


# ── Connection Models ────────────────────────────────────────
class ConnectionRequest(BaseModel):
    """Payload for POST /api/connections/request"""
    to_uid: str
    message: Optional[str] = ""


class ConnectionResponse(BaseModel):
    """Payload for PATCH /api/connections/{connection_id}"""
    action: Literal["accept", "decline"]


class ConnectionRecord(BaseModel):
    """A connection record as stored in Firestore."""
    id: str
    from_uid: str
    to_uid: str
    status: Literal["pending", "accepted", "declined"]
    message: str
    created_at: Optional[datetime]
    # Contact info shown after acceptance
    from_email: Optional[str] = None
    to_email: Optional[str] = None
