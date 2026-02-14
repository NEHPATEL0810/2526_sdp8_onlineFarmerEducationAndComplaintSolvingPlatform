from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer
import uuid

@api_view(["POST"])
@permission_classes([AllowAny])
def farmer_chat(request):
    question = request.data.get("question")

    if not question:
        return Response({"error": "question is required"}, status=400)

    # Create or retrieve a chat session
    # For authenticated users, link to their account
    # For anonymous users, use a session_id from the request or generate one
    session_id = request.data.get("session_id")

    if request.user.is_authenticated:
        session, _ = ChatSession.objects.get_or_create(
            user=request.user,
            session_id=session_id or str(uuid.uuid4()),
        )
    else:
        # For anonymous requests, create a session without a user
        if session_id:
            session, _ = ChatSession.objects.get_or_create(session_id=session_id)
        else:
            session = ChatSession.objects.create(session_id=str(uuid.uuid4()))

    # Log the user's message
    ChatMessage.objects.create(
        session=session,
        role="user",
        input_text=question,
    )

    # Get RAG answer
    answer, retrieved = get_answer(question)

    # Log the assistant's response
    ChatMessage.objects.create(
        session=session,
        role="assistant",
        output_text=answer,
        retrieved_chunks=retrieved,
    )

    return Response({
        "answer": answer,
        "retrieved": retrieved,
        "session_id": session.session_id,
    })