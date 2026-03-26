"""
============================================================
utils/firebase_admin.py — Firebase Admin SDK Setup
============================================================

Initializes the Firebase Admin SDK once.
Provides helper to get the Firestore db client.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from app.config import settings

# Module-level db client (set after initialization)
_db = None


def initialize_firebase():
    """
    Initialize the Firebase Admin SDK using the service account JSON.
    Safe to call multiple times — checks if already initialized.
    """
    global _db

    if not firebase_admin._apps:
        # Load credentials from the service account file
        cred = credentials.Certificate(settings.firebase_service_account_path)
        firebase_admin.initialize_app(cred)

    # Cache the Firestore client
    _db = firestore.client()
    return _db


def get_db() -> firestore.Client:
    """
    Return the Firestore client.
    Call initialize_firebase() on startup before using this.
    """
    if _db is None:
        raise RuntimeError("Firebase not initialized. Call initialize_firebase() first.")
    return _db
