"""
============================================================
routers/connections.py — Connection Request Endpoints
============================================================

Handles the request/accept/decline flow between matched users.
On acceptance, both users' contact info is made available.

Endpoints:
  POST  /api/connections/request         — Send connection request
  PATCH /api/connections/{id}            — Accept or decline a request
  GET   /api/connections/pending         — List incoming pending requests
  GET   /api/connections/accepted        — List accepted connections (with contact info)
"""

from inspect import isawaitable
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ConnectionRequest, ConnectionResponse, ConnectionRecord
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db
from google.cloud import firestore
from typing import List
import uuid

router = APIRouter()


@router.post("/request")
async def send_connection_request(
    body: ConnectionRequest,
    current_uid: str = Depends(get_current_user),
):
    """
    Send a connection request to another user.
    Prevents duplicate requests (checks for existing pending/accepted connection).
    """
    db = get_db()

    # Prevent self-connection
    if body.to_uid == current_uid:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself.")

    # Check for existing connection
    existing = db.collection("connections") \
        .where("from_uid", "==", current_uid) \
        .where("to_uid", "==", body.to_uid) \
        .get()

    if existing:
        raise HTTPException(status_code=409, detail="Connection request already exists.")

    # Create the connection document
    connection_id = str(uuid.uuid4())
    db.collection("connections").document(connection_id).set({
        "id": connection_id,
        "from_uid": current_uid,
        "to_uid": body.to_uid,
        "status": "pending",
        "message": body.message or "",
        "createdAt": firestore.SERVER_TIMESTAMP,
    })

    return {"success": True, "connection_id": connection_id}


@router.patch("/{connection_id}")
async def respond_to_connection(
    connection_id: str,
    body: ConnectionResponse,
    current_uid: str = Depends(get_current_user),
):
    """
    Accept or decline a connection request.
    Only the recipient (to_uid) can respond.

    On acceptance:
      - Sets status to "accepted"
      - Adds each user's UID to the other's connections array in Firestore
    """
    db = get_db()
    ref = db.collection("connections").document(connection_id)
    doc = ref.get()
    doc = await doc if isawaitable(doc) else doc  # Handle both sync and async Firestore clients

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Connection not found.")

    conn = doc.to_dict()

    if conn is None:
        raise HTTPException(status_code=404, detail="Connection data is empty.")

    # Authorization: only the recipient can respond
    if conn["to_uid"] != current_uid:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this request.")

    if conn["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already responded to.")

    new_status = "accepted" if body.action == "accept" else "declined"
    ref.update({"status": new_status})

    if new_status == "accepted":
        # Add each user to the other's connections list
        db.collection("users").document(current_uid).update({
            "connections": firestore.ArrayUnion([conn["from_uid"]])
        })
        db.collection("users").document(conn["from_uid"]).update({
            "connections": firestore.ArrayUnion([current_uid])
        })

    return {"success": True, "status": new_status}


@router.get("/pending", response_model=List[ConnectionRecord])
async def get_pending_requests(current_uid: str = Depends(get_current_user)):
    """
    Get all incoming pending connection requests for the current user.
    Includes the sender's display name for the notification widget.
    """
    db = get_db()
    docs = db.collection("connections") \
        .where("to_uid", "==", current_uid) \
        .where("status", "==", "pending") \
        .stream()

    results = []
    for doc in docs:
        conn = doc.to_dict()
        
        if conn is None:
            continue
        
        # Fetch sender's display name
        sender_doc = db.collection("users").document(conn["from_uid"]).get()
        sender_doc = await sender_doc if isawaitable(sender_doc) else sender_doc
        sender_data = sender_doc.to_dict() if sender_doc.exists else {}

        results.append(ConnectionRecord(
            id=conn["id"],
            from_uid=conn["from_uid"],
            to_uid=conn["to_uid"],
            status=conn["status"],
            message=conn.get("message", ""),
            created_at=conn.get("createdAt"),
            from_email=(sender_data or {}).get("email"),
        ))

    return results


@router.get("/accepted", response_model=List[ConnectionRecord])
async def get_accepted_connections(current_uid: str = Depends(get_current_user)):
    """
    Get all accepted connections for the current user.
    Includes email addresses of both parties for contact.
    """
    db = get_db()

    # Fetch connections where current user is sender
    sent = db.collection("connections") \
        .where("from_uid", "==", current_uid) \
        .where("status", "==", "accepted") \
        .stream()

    # Fetch connections where current user is recipient
    received = db.collection("connections") \
        .where("to_uid", "==", current_uid) \
        .where("status", "==", "accepted") \
        .stream()

    results = []
    for doc in list(sent) + list(received):
        conn = doc.to_dict()
        
        if conn is None:
            continue
        
        other_uid = conn["to_uid"] if conn["from_uid"] == current_uid else conn["from_uid"]

        other_doc = db.collection("users").document(other_uid).get()
        other_doc = await other_doc if isawaitable(other_doc) else other_doc
        other_data = other_doc.to_dict() if other_doc.exists else {}

        results.append(ConnectionRecord(
            id=conn["id"],
            from_uid=conn["from_uid"],
            to_uid=conn["to_uid"],
            status="accepted",
            message=conn.get("message", ""),
            created_at=conn.get("createdAt"),
            to_email=(other_data or {}).get("email"),
            from_email=(other_data or {}).get("email"),
        ))

    return results
