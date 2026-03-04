from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer
from groq import Groq
from django.conf import settings
import pdfplumber
import uuid
import io
import base64
import fitz  # pymupdf

client = Groq(api_key=settings.GROQ_API_KEY)


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

    if session_id:
        try:
            session = ChatSession.objects.get(session_id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            session = ChatSession.objects.create(
                user=request.user,
                session_id=session_id,
                title="New Chat",
            )
    else:
        session = ChatSession.objects.create(
            user=request.user,
            session_id=str(uuid.uuid4()),
            title="New Chat",
        )

    if session.title == "New Chat":
        session.title = question[:80]
        session.save(update_fields=["title"])

    ChatMessage.objects.create(session=session, role="user", input_text=question)

    answer, retrieved, confidence = get_answer(question)

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
# Helpers for analyze_pdf
# ─────────────────────────────────────────────

AGRI_SYSTEM_PROMPT = (
    "You are an expert agricultural document analyst. "
    "When given content from a farming or agricultural document, provide:\n"
    "1. A concise summary (3-5 sentences)\n"
    "2. Key topics covered (bullet list)\n"
    "3. Practical takeaways for farmers (bullet list)\n\n"
    "Use simple, farmer-friendly language. Do not mention source filenames."
)


def _summarize_text(client, filename, text, truncated):
    """Summarize extracted text via Groq text model."""
    prompt = (
        f"Please analyze this agricultural document and summarize it.\n\n"
        f"Document: {filename}\n\nContent:\n{text}"
        + ("\n\n[Note: Document was truncated due to length]" if truncated else "")
    )
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": AGRI_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    return resp.choices[0].message.content.strip()


def _summarize_images(client, filename, page_images):
    """
    Send PDF page images to Groq vision model for OCR + analysis.
    page_images: list of (page_num, base64_png_string)
    """
    # Build a multi-image message — Groq vision accepts multiple image_url content parts
    content = [
        {
            "type": "text",
            "text": (
                f"The following are pages from an agricultural PDF document '{filename}'. "
                f"Please analyze the content across all pages and provide:\n"
                "1. A concise summary (3-5 sentences)\n"
                "2. Key topics covered (bullet list)\n"
                "3. Practical takeaways for farmers (bullet list)\n\n"
                "Use simple, farmer-friendly language."
            ),
        }
    ]
    for page_num, b64 in page_images:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{b64}"
            },
        })

    resp = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": content}],
        temperature=0.2,
        max_tokens=1024,
    )
    return resp.choices[0].message.content.strip()


# ─────────────────────────────────────────────
# POST /api/chat/analyze-pdf/
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_pdf(request):
    pdf_file = request.FILES.get("file")
    if not pdf_file:
        return Response({"error": "No file uploaded"}, status=400)
    if not pdf_file.name.lower().endswith(".pdf"):
        return Response({"error": "Only PDF files are supported"}, status=400)

    pdf_bytes = pdf_file.read()
    used_ocr = False
    summary = ""
    pages_processed = 0
    was_truncated = False

    # ── Stage 1: Try text extraction with pdfplumber ──────────────────────────
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages_text = []
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(f"[Page {i}]\n{text.strip()}")
        full_text = "\n\n".join(pages_text)
    except Exception:
        full_text = ""

    if full_text.strip():
        # Good text — summarize normally
        MAX_CHARS = 12000
        truncated_text = full_text[:MAX_CHARS]
        was_truncated = len(full_text) > MAX_CHARS
        pages_processed = len(pages_text)
        try:
            summary = _summarize_text(client, pdf_file.name, truncated_text, was_truncated)
        except Exception as e:
            return Response({"error": f"LLM error: {str(e)}"}, status=500)
    else:
        # ── Stage 2: Image-based PDF — render pages → vision model ────────────
        used_ocr = True
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            MAX_PAGES = 10  # Limit to avoid exceeding Groq context
            page_images = []
            for i, page in enumerate(doc):
                if i >= MAX_PAGES:
                    was_truncated = True
                    break
                # Render at 150 DPI (matrix scale factor ~2.08 for 72→150 dpi)
                mat = fitz.Matrix(150 / 72, 150 / 72)
                pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB, alpha=False)
                png_bytes = pix.tobytes("png")
                b64 = base64.b64encode(png_bytes).decode("utf-8")
                page_images.append((i + 1, b64))
            doc.close()
            pages_processed = len(page_images)
        except Exception as e:
            return Response({"error": f"Could not render PDF pages: {str(e)}"}, status=400)

        if not page_images:
            return Response({"error": "PDF appears to be empty or unreadable."}, status=422)

        try:
            summary = _summarize_images(client, pdf_file.name, page_images)
        except Exception as e:
            return Response({"error": f"Vision LLM error: {str(e)}"}, status=500)

    # ── Save to session ──────────────────────────────────────────────────────
    session_id = request.data.get("session_id")
    session = None
    if session_id:
        try:
            session = ChatSession.objects.get(session_id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            pass
    if not session:
        session = ChatSession.objects.create(
            user=request.user,
            session_id=str(uuid.uuid4()),
            title=f"Analysis: {pdf_file.name[:60]}",
        )
    if session.title == "New Chat":
        session.title = f"Analysis: {pdf_file.name[:60]}"
        session.save(update_fields=["title"])

    user_msg = f"[PDF Uploaded: {pdf_file.name}]\nPlease analyze and summarize this document."
    ChatMessage.objects.create(session=session, role="user", input_text=user_msg)
    ChatMessage.objects.create(session=session, role="assistant", output_text=summary, confidence="HIGH")

    return Response({
        "summary": summary,
        "filename": pdf_file.name,
        "pages": pages_processed,
        "truncated": was_truncated,
        "used_ocr": used_ocr,
        "session_id": session.session_id,
        "title": session.title,
    })


# ─────────────────────────────────────────────
# GET /api/chat/sessions/
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
# GET / DELETE / PATCH /api/chat/sessions/<id>/
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