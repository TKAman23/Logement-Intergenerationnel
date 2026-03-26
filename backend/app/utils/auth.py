"""
============================================================
utils/auth.py — Firebase Token Verification Dependency
============================================================

FastAPI dependency that verifies the Firebase Auth ID token
passed in the Authorization header on protected routes.

Usage in a router:
    from app.utils.auth import get_current_user

    @router.get("/protected")
    async def protected_route(uid: str = Depends(get_current_user)):
        ...
"""

from fastapi import HTTPException, Header
from firebase_admin import auth


async def get_current_user(authorization: str = Header(...)) -> str:
    """
    Extracts and verifies the Firebase ID token from the Authorization header.
    Returns the authenticated user's UID string.

    The frontend sends: Authorization: Bearer <firebase_id_token>
    """
    # Expect format: "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format.")

    token = authorization.split(" ", 1)[1]

    try:
        # Verify the token with Firebase — this checks expiry, signature, etc.
        decoded_token = auth.verify_id_token(token)
        uid: str = decoded_token["uid"]
        return uid
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
