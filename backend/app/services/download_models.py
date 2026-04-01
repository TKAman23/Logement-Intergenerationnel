"""
============================================================
services/download_models.py — Pre-download HuggingFace Models
============================================================

Run this script once before starting the server to download
and cache the NLP models locally. This avoids the delay on
the first API request.

Usage:
    python app/services/download_models.py
"""

from transformers.pipelines import pipeline
from typing import cast, Literal, Any

MODELS = [
    {
        "task": "text-classification",
        "model": "j-hartmann/emotion-english-distilroberta-base",
        "desc": "Emotion scorer (joy, sadness, anger, fear, surprise...)"
    },
    {
        "task": "text-classification",
        "model": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "desc": "Sentiment scorer (positive / negative / neutral)"
    },
]

if __name__ == "__main__":
    print("📥 Downloading HuggingFace models to local cache...\n")
    for m in MODELS:
        print(f"  ⬇ {m['model']} — {m['desc']}")
        pipe = pipeline(cast(Literal["text-classification"], m["task"]), model=m["model"], top_k=None)
        # Run a test inference to verify
        result: Any = pipe("I love spending time with family and friends.", truncation=True)
        print(f"    ✓ Loaded. Sample output: {result[0][0]}\n")
    print("✅ All models downloaded and cached.")
