"""
============================================================
services/vibe_scorer.py — HuggingFace Vibe Scoring Engine
============================================================

This is the heart of the matching system.
It takes free-text lifestyle answers and scores them across
8 personality/lifestyle dimensions using HuggingFace pipelines.

Model Strategy:
  - j-hartmann/emotion-english-distilroberta-base → emotion scores
    (joy, anger, sadness, fear, disgust, surprise, neutral)
    Used for: friendliness (joy proxy), empathy, quiet/energetic
  - cardiffnlp/twitter-roberta-base-sentiment-latest → sentiment
    Used as supporting signal for assertiveness and general tone
  - Keyword/lexicon scoring → fast, explainable fallback for
    dimensions where no single model is a perfect fit:
    assertiveness, inquisitiveness, noisiness, early_night,
    introvert_extrovert

All models are free and run locally (CPU). First load takes ~30s.
"""

import re
from typing import Dict
from transformers import pipeline


# ── Keyword Lexicons ────────────────────────────────────────
# Each dimension has a list of words that push the score toward 1.0
# and words that push toward 0.0.
# Score = (count_high - count_low) / (total + 1) → normalized to [0, 1]

LEXICONS: Dict[str, Dict[str, list]] = {
    "introvert_extrovert": {
        # 0.0 = introvert, 1.0 = extrovert
        "high": [
            "party", "social", "friends", "outgoing", "meet", "people",
            "gathering", "group", "lively", "network", "events", "crowd",
            "socializing", "energized by people", "love meeting"
        ],
        "low": [
            "alone", "quiet", "solitude", "recharge", "reading", "introvert",
            "homebody", "private", "peaceful", "myself", "solo", "independent",
            "small group", "one on one", "reserved"
        ],
    },
    "assertiveness": {
        # 0.0 = passive/agreeable, 1.0 = assertive/direct
        "high": [
            "direct", "clear", "confident", "boundary", "straightforward",
            "assert", "firm", "speak up", "honest", "decisive", "stand my ground",
            "won't hesitate", "communicate clearly"
        ],
        "low": [
            "go with the flow", "easy going", "flexible", "whatever works",
            "no problem", "i adapt", "laid back", "usually agree",
            "don't mind", "prefer to avoid conflict"
        ],
    },
    "inquisitiveness": {
        # 0.0 = routine-oriented, 1.0 = curious/exploratory
        "high": [
            "curious", "learn", "explore", "discover", "wonder", "question",
            "research", "experiment", "interested in", "fascinated", "study",
            "new ideas", "hobby", "passionate", "books", "documentary",
            "museum", "science", "art", "philosophy"
        ],
        "low": [
            "routine", "same", "comfort zone", "prefer familiar",
            "not really interested", "simple", "straightforward",
            "don't think about", "basic"
        ],
    },
    "noisiness": {
        # 0.0 = quiet/noise-sensitive, 1.0 = noisy/tolerant of noise
        "high": [
            "music", "loud", "tv", "podcast", "noise", "play",
            "background sound", "energetic", "lively", "people around",
            "open to noise", "don't mind sound", "children"
        ],
        "low": [
            "quiet", "silence", "peaceful", "no noise", "calm", "serene",
            "work from home", "concentration", "meditate", "sensitive to noise",
            "light sleeper", "need quiet"
        ],
    },
    "early_night": {
        # 0.0 = early bird, 1.0 = night owl
        "high": [
            "night", "late", "midnight", "evening", "night owl", "stay up",
            "productive at night", "after dark", "nocturnal", "late night"
        ],
        "low": [
            "morning", "early", "sunrise", "wake up early", "6am", "7am",
            "early bird", "dawn", "morning routine", "breakfast early",
            "up before"
        ],
    },
}


class VibeScorer:
    """
    Singleton class that holds loaded HuggingFace pipelines and
    lexicons for scoring lifestyle answers.

    Usage:
        scorer = VibeScorer.get_instance()
        scores = scorer.score_answers(lifestyle_answers_dict)
    """

    _instance: "VibeScorer | None" = None

    def __init__(self):
        print("  Loading emotion model (distilroberta)...")
        # Emotion model: outputs joy, anger, sadness, fear, disgust, surprise, neutral
        self.emotion_pipe = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,        # Return ALL emotion scores, not just top-1
            truncation=True,
            max_length=512,
        )

        print("  Loading sentiment model (roberta-base)...")
        # Sentiment model: outputs positive / negative / neutral
        self.sentiment_pipe = pipeline(
            "text-classification",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            top_k=None,
            truncation=True,
            max_length=512,
        )

        print("  NLP models ready ✓")

    @classmethod
    def get_instance(cls) -> "VibeScorer":
        """Return the singleton instance, creating it if needed."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Public Method ────────────────────────────────────────
    def score_answers(self, answers: Dict[str, str]) -> Dict[str, float]:
        """
        Given a dict of {question_key: answer_text}, compute VibeScores.

        Returns a dict matching the VibeScores model fields, all floats 0.0–1.0.
        """
        # Concatenate all answers for holistic model scoring
        full_text = " ".join(v for v in answers.values() if v.strip())

        if not full_text.strip():
            # No answers provided — return neutral scores
            return {k: 0.5 for k in [
                "introvert_extrovert", "quiet_energetic", "friendliness",
                "assertiveness", "empathy", "inquisitiveness",
                "noisiness", "early_night"
            ]}

        # ── Run model pipelines ──────────────────────────────
        emotion_scores = self._run_emotion(full_text)
        sentiment_scores = self._run_sentiment(full_text)

        # ── Run lexicon scoring on specific question answers ─
        # Use specific answers where they're most relevant
        lex_scores = {
            key: self._lexicon_score(full_text, key)
            for key in LEXICONS
        }

        # ── Combine into final dimension scores ─────────────
        return {
            # Introvert/Extrovert: primarily lexicon
            "introvert_extrovert": lex_scores["introvert_extrovert"],

            # Quiet/Energetic: blend of joy+surprise from emotion + sentiment positivity
            "quiet_energetic": self._blend(
                emotion_scores.get("joy", 0.5),
                emotion_scores.get("surprise", 0.5),
                sentiment_scores.get("positive", 0.5),
                weights=[0.4, 0.3, 0.3]
            ),

            # Friendliness: joy is a strong proxy; positive sentiment supports it
            "friendliness": self._blend(
                emotion_scores.get("joy", 0.5),
                sentiment_scores.get("positive", 0.5),
                weights=[0.6, 0.4]
            ),

            # Assertiveness: primarily lexicon; low fear/sadness supports assertiveness
            "assertiveness": self._blend(
                lex_scores["assertiveness"],
                1.0 - emotion_scores.get("fear", 0.5),
                1.0 - emotion_scores.get("sadness", 0.5),
                weights=[0.5, 0.25, 0.25]
            ),

            # Empathy: sadness + fear together indicate emotional attunement
            # High empathy people often mention others' feelings
            "empathy": self._blend(
                emotion_scores.get("sadness", 0.5),
                emotion_scores.get("fear", 0.5),
                sentiment_scores.get("positive", 0.5),
                weights=[0.35, 0.25, 0.4]
            ),

            # Inquisitiveness: primarily lexicon; surprise is a curiosity signal
            "inquisitiveness": self._blend(
                lex_scores["inquisitiveness"],
                emotion_scores.get("surprise", 0.5),
                weights=[0.7, 0.3]
            ),

            # Noisiness: primarily lexicon
            "noisiness": lex_scores["noisiness"],

            # Early bird / Night owl: primarily lexicon
            "early_night": lex_scores["early_night"],
        }

    # ── Private Helpers ──────────────────────────────────────
    def _run_emotion(self, text: str) -> Dict[str, float]:
        """
        Run the emotion pipeline and return a flat dict of {label: score}.
        Normalizes label names to lowercase.
        """
        results = self.emotion_pipe(text[:512])  # Truncate to model max
        # pipeline returns: [[{"label": "joy", "score": 0.9}, ...]]
        return {str(r["label"].lower()): float(r["score"]) for r in results[0]}

    def _run_sentiment(self, text: str) -> Dict[str, float]:
        """
        Run sentiment pipeline and return {positive/negative/neutral: score}.
        """
        results = self.sentiment_pipe(text[:512])
        return {str(r["label"].lower()): float(r["score"]) for r in results[0]}

    def _lexicon_score(self, text: str, dimension: str) -> float:
        """
        Score text against a dimension's keyword lexicon.
        Returns 0.0–1.0 where:
          0.0 = strongly matches "low" keywords
          1.0 = strongly matches "high" keywords
          0.5 = neutral / balanced
        """
        lexicon = LEXICONS[dimension]
        text_lower = text.lower()

        # Count keyword hits (multi-word phrases supported)
        count_high = sum(1 for kw in lexicon["high"] if kw in text_lower)
        count_low  = sum(1 for kw in lexicon["low"]  if kw in text_lower)
        total = count_high + count_low

        if total == 0:
            return 0.5  # No signal → neutral

        # Normalize: proportion of high-side hits
        raw = count_high / total

        # Blend toward 0.5 slightly to avoid extreme scores from few words
        return 0.3 * 0.5 + 0.7 * raw

    @staticmethod
    def _blend(*values: float, weights: list) -> float:
        """
        Weighted average of multiple scores, clamped to [0, 1].
        weights must sum to 1.0.
        """
        assert len(values) == len(weights), "Values and weights must match."
        result = sum(v * w for v, w in zip(values, weights))
        return max(0.0, min(1.0, result))
