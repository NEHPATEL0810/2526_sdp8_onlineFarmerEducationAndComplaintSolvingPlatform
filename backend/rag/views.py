from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer
import uuid


# ─────────────────────────────────────────────
# POST /api/chat/   — send a message, get answer
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def farmer_chat(request):
    question = request.data.get("question", "").strip()
    if not question:
        return Response({"error": "question is required"}, status=400)

    session_id = request.data.get("session_id")

    # Safely look up or create session — never mix user + session_id in one query
    # to avoid cross-user session hijacking.
    if session_id:
        # Try to find an existing session that belongs to this user
        try:
            session = ChatSession.objects.get(
                session_id=session_id, user=request.user
            )
        except ChatSession.DoesNotExist:
            # Session doesn't exist or doesn't belong to user; create a fresh one
            session = ChatSession.objects.create(
                user=request.user,
                session_id=session_id,
                title="New Chat",
            )
    else:
        # No session_id provided → create a brand-new session
        session = ChatSession.objects.create(
            user=request.user,
            session_id=str(uuid.uuid4()),
            title="New Chat",
        )

    # Set title from first user message
    if session.title == "New Chat":
        session.title = question[:80]
        session.save(update_fields=["title"])

    # Log user message
    ChatMessage.objects.create(
        session=session,
        role="user",
        input_text=question,
    )

    # RAG answer
    answer, retrieved, confidence = get_answer(question)

    # Log assistant response
    ChatMessage.objects.create(
        session=session,
        role="assistant",
        output_text=answer,
        retrieved_chunks=retrieved,
        confidence=confidence,
    )

    return Response({
        "answer": answer,
        "retrieved": retrieved,
        "confidence": confidence,
        "session_id": session.session_id,
        "title": session.title,
    })


# ─────────────────────────────────────────────
# GET /api/chat/sessions/  — list all sessions
# ─────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    sessions = ChatSession.objects.filter(user=request.user).order_by("-updated_at")
    data = []
    for s in sessions:
        last_msg = s.messages.last()
        data.append({
            "session_id": s.session_id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
            "last_message": (last_msg.output_text or last_msg.input_text or "")[:80]
            if last_msg else "",
        })
    return Response(data)


# ─────────────────────────────────────────────
# GET /api/chat/sessions/<session_id>/messages/
#   — fetch full message history for one session
# DELETE /api/chat/sessions/<session_id>/
#   — delete a session and all its messages
# PATCH /api/chat/sessions/<session_id>/
#   — rename a session
# ─────────────────────────────────────────────
@api_view(["GET", "DELETE", "PATCH"])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    try:
        session = ChatSession.objects.get(session_id=session_id, user=request.user)
    except ChatSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    if request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if request.method == "PATCH":
        new_title = request.data.get("title", "").strip()
        if new_title:
            session.title = new_title[:200]
            session.save(update_fields=["title"])
        return Response({"session_id": session.session_id, "title": session.title})

    # GET — return all messages
    messages = []
    for msg in session.messages.all():
        if msg.role == "user":
            messages.append({
                "id": f"db-{msg.id}",
                "role": "user",
                "content": msg.input_text or "",
                "timestamp": msg.timestamp.isoformat(),
            })
        else:
            messages.append({
                "id": f"db-{msg.id}",
                "role": "assistant",
                "content": msg.output_text or "",
                "retrieved": msg.retrieved_chunks or [],
                "confidence": msg.confidence,
                "timestamp": msg.timestamp.isoformat(),
            })
    return Response({
        "session_id": session.session_id,
        "title": session.title,
        "messages": messages,
    })