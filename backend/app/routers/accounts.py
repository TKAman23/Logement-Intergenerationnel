"""
============================================================
routers/accounts.py — Account Management Endpoints
============================================================

Firebase Auth handles sign-up/sign-in on the frontend.
This router handles the server-side Firestore user record.

Endpoints:
  POST   /api/accounts/init    — Create user document on first sign-in
  DELETE /api/accounts/me      — Delete account + profile data
"""

from inspect import isawaitable
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db

router = APIRouter()


@router.post("/init")
async def init_account(current_uid: str = Depends(get_current_user)):
    """
    Called by the frontend after a user signs in for the first time.
    Creates a Firestore document for the user if one doesn't exist yet.
    Safe to call multiple times (idempotent).
    """
    db = get_db()
    ref = db.collection("users").document(current_uid)
    doc = ref.get()
    doc = await doc if isawaitable(doc) else doc  # Handle both sync and async Firestore clients

    if not doc.exists:
        # Get display name + email from Firebase Auth
        firebase_user = auth.get_user(current_uid)

        ref.set({
            "displayName": firebase_user.display_name or "",
            "email": firebase_user.email or "",
            "photoURL": firebase_user.photo_url or None,
            "createdAt": None,  # Will be set by Firestore server timestamp
            "role": "either",
            "connections": [],
            "profile": {},  # Empty profile — user fills this in
        })
        return {"created": True}

    return {"created": False, "message": "Account already exists."}


@router.delete("/me")
async def delete_account(current_uid: str = Depends(get_current_user)):
    """
    Permanently deletes the user's Firestore document and Firebase Auth account.
    Also removes all pending connections involving this user.
    """
    db = get_db()

    # Delete Firestore user document
    db.collection("users").document(current_uid).delete()

    # Remove all connections involving this user
    connections = db.collection("connections") \
        .where("from_uid", "==", current_uid).stream()
    for conn in connections:
        conn.reference.delete()

    connections_to = db.collection("connections") \
        .where("to_uid", "==", current_uid).stream()
    for conn in connections_to:
        conn.reference.delete()

    # Delete Firebase Auth user
    auth.delete_user(current_uid)

    return {"success": True, "message": "Account deleted."}
