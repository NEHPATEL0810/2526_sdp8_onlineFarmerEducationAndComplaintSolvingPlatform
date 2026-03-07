from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer, _get_vector_store
from groq import Groq
from django.conf import settings
import pdfplumber
import uuid
import io
import base64
import fitz  # pymupdf

_client = None


def _get_client():
    """Lazy-load the Groq client for views."""
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


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
    "FIRST, evaluate if the provided document is relevant to agriculture, farming, crops, livestock, soil, weather, or rural development. "
    "If it is NOT relevant to agriculture, reply EXACTLY with:\n"
    "'This document does not appear to be related to agriculture or farming. I can only assist with agriculture-related documents.'\n"
    "If it IS relevant, fulfill the user's specific request based on the document's content. "
    "If the user asks to summarize, analyze, or explain, follow their instructions strictly using the provided document text. "
    "If the user does not provide specific instructions, provide a concise summary (3-5 sentences), key topics (bullet list), and practical takeaways. "
    "Use simple, farmer-friendly language.\n\n"
    "CRITICAL RULES:\n"
    "- NEVER use phrases like 'According to the source document' or 'Based on the provided text'.\n"
    "- NEVER mention 'Sources', 'Source 1', or filenames in your response.\n"
    "- Answer directly as if you are the domain expert providing the analysis."
)


def _summarize_text(llm_client, filename, text, truncated, user_prompt=None):
    """Summarize extracted text via Groq text model."""
    req_text = user_prompt if user_prompt else "Please analyze this agricultural document and summarize it."
    prompt = (
        f"User Request: {req_text}\n\n"
        f"Document: {filename}\n\nContent:\n{text}"
        + ("\n\n[Note: Document was truncated due to length]" if truncated else "")
    )
    resp = llm_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": AGRI_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=1024,
    )
    return resp.choices[0].message.content.strip()


def _summarize_images(llm_client, filename, page_images, user_prompt=None):
    """
    Send PDF page images to Groq vision model for OCR + analysis.
    page_images: list of (page_num, base64_png_string)
    """
    req_text = user_prompt if user_prompt else "Please analyze this agricultural document and summarize it."
    # Build a multi-image message — Groq vision accepts multiple image_url content parts
    content = [
        {
            "type": "text",
            "text": (
                f"User Request: {req_text}\n\n"
                f"The following are pages from a PDF document '{filename}'. "
                f"Please follow the system instructions and evaluate/analyze the content."
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

    resp = llm_client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {"role": "system", "content": AGRI_SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
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
    user_prompt = request.data.get("prompt", "").strip()

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
    else:
        # ── Stage 2: Image-based PDF — render pages → vision model ────────────
        used_ocr = True
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            MAX_PAGES = 5  # Limit to avoid exceeding Groq context (max 5 images)
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

        # For OCR PDFs, we need to extract some text to check relevance against the DB
        # Run a quick dummy call or just rely on the LLM to reject it?
        # Since OCR is expensive, let's just let the LLM reject it using the AGRI_SYSTEM_PROMPT.
        # But for text PDFs, we CAN check the vector DB for relevance.
        
    # ── Database Relevance Check (Text PDFs) ─────────────────────────────────
    if not used_ocr and full_text.strip():
        # Check relevance: search the vector store with the first chunk of the PDF
        check_text = full_text[:1000]
        results = _get_vector_store().search(check_text, k=3, threshold=0.0) # get top 3 regardless of threshold
        if results:
            max_score = max(r["score"] for r in results)
            # If the best match in our agricultural database has a cosine similarity < 0.15,
            # it's highly likely this document has nothing to do with agriculture.
            if max_score < 0.15:
                err_msg = "This document does not appear to be related to agriculture or farming. I can only assist with agriculture-related documents."
                # Save as a rejected chat
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
                        title=f"Rejected: {pdf_file.name[:30]}",
                    )
                user_msg_content = user_prompt if user_prompt else "Please analyze and summarize this document."
                user_msg = f"[PDF Uploaded: {pdf_file.name}]\n{user_msg_content}"
                ChatMessage.objects.create(session=session, role="user", input_text=user_msg)
                ChatMessage.objects.create(session=session, role="assistant", output_text=err_msg, confidence="LOW")
                
                return Response({
                    "summary": err_msg,
                    "filename": pdf_file.name,
                    "pages": pages_processed,
                    "truncated": was_truncated,
                    "used_ocr": used_ocr,
                    "session_id": session.session_id,
                    "title": session.title,
                })

    # ── LLM Analysis ─────────────────────────────────────────────────────────
    if not used_ocr:
        try:
            summary = _summarize_text(_get_client(), pdf_file.name, truncated_text, was_truncated, user_prompt)
        except Exception as e:
            return Response({"error": f"LLM error: {str(e)}"}, status=500)
    else:
        try:
            summary = _summarize_images(_get_client(), pdf_file.name, page_images, user_prompt)
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

    user_msg_content = user_prompt if user_prompt else "Please analyze and summarize this document."
    user_msg = f"[PDF Uploaded: {pdf_file.name}]\n{user_msg_content}"
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
# Helpers: session + message persistence
# ─────────────────────────────────────────────

def _get_or_create_session(request, session_id, title="New Chat"):
    """Find existing session or create a new one."""
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
            title=title,
        )
    if session.title == "New Chat":
        session.title = title
        session.save(update_fields=["title"])
    return session


def _save_messages(session, user_text, assistant_text, confidence="HIGH"):
    """Save a user + assistant message pair."""
    ChatMessage.objects.create(session=session, role="user", input_text=user_text)
    ChatMessage.objects.create(
        session=session, role="assistant",
        output_text=assistant_text, confidence=confidence,
    )


# ─────────────────────────────────────────────
# POST /api/chat/analyze-image/
# ─────────────────────────────────────────────

IMAGE_ANALYSIS_SYSTEM_PROMPT = (
    "You are an expert agricultural image analyst for the FarmEasy platform.\n"
    "Analyze the provided image and identify:\n"
    "1. **Issue**: What problem or condition is visible in the image\n"
    "2. **Cause**: What is likely causing this issue\n"
    "3. **Solution**: Practical, step-by-step advice to address the issue\n\n"
    "Use simple, farmer-friendly language.\n"
    "If the image does not appear to show an agricultural issue, say so clearly.\n\n"
    "CRITICAL RULES:\n"
    "- NEVER use phrases like 'According to the source' or 'Based on the provided text'.\n"
    "- Answer directly as if you are the domain expert providing the analysis.\n"
    "- Structure your response clearly with the three headings: Issue, Cause, Solution."
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp",
}


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_image(request):
    image_file = request.FILES.get("image")
    if not image_file:
        return Response({"error": "No image uploaded"}, status=400)

    content_type = image_file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        return Response(
            {"error": f"Unsupported file type '{content_type}'. Please upload a JPG, PNG, or WebP image."},
            status=400,
        )

    user_prompt = request.data.get("prompt", "").strip()
    session_id = request.data.get("session_id", "").strip() or None

    # ── Read and encode image ────────────────────────────────────────────────
    image_bytes = image_file.read()
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    mime = content_type if content_type else "image/jpeg"

    # ── Vector relevance check ───────────────────────────────────────────────
    check_text = user_prompt
    if not check_text:
        # No prompt — ask the vision model for a short description first
        try:
            desc_resp = _get_client().chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Describe this image in one short sentence focusing "
                            "on what it shows (crop, plant, soil, animal, etc.)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
                            {"type": "text", "text": "What does this image show?"},
                        ],
                    },
                ],
                temperature=0.1,
                max_tokens=100,
            )
            check_text = desc_resp.choices[0].message.content.strip()
        except Exception:
            check_text = ""

    if check_text:
        results = _get_vector_store().search(check_text, k=3, threshold=0.0)
        if results:
            max_score = max(r["score"] for r in results)
            if max_score < 0.15:
                err_msg = (
                    "This image/query does not appear to be related to agriculture "
                    "or farming. I can only assist with agriculture-related queries."
                )
                session = _get_or_create_session(
                    request, session_id, title=f"Rejected: {image_file.name[:30]}",
                )
                _save_messages(
                    session,
                    user_text=f"[Image Uploaded: {image_file.name}]\n{user_prompt or 'Analyze this image.'}",
                    assistant_text=err_msg,
                    confidence="LOW",
                )
                return Response({
                    "summary": err_msg,
                    "filename": image_file.name,
                    "session_id": session.session_id,
                    "title": session.title,
                })

    # ── Vision LLM Analysis ──────────────────────────────────────────────────
    analysis_prompt = (
        user_prompt
        if user_prompt
        else "What issue does this image show? Please identify the problem, its cause, and suggest a solution."
    )
    content = [
        {"type": "text", "text": analysis_prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
    ]

    try:
        resp = _get_client().chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": IMAGE_ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            temperature=0.2,
            max_tokens=1024,
        )
        summary = resp.choices[0].message.content.strip()
    except Exception as e:
        return Response({"error": f"Vision LLM error: {str(e)}"}, status=500)

    # ── Save to session ──────────────────────────────────────────────────────
    session = _get_or_create_session(
        request, session_id, title=f"Image Analysis: {image_file.name[:50]}",
    )
    _save_messages(
        session,
        user_text=f"[Image Uploaded: {image_file.name}]\n{user_prompt or 'Analyze this image.'}",
        assistant_text=summary,
        confidence="HIGH",
    )

    return Response({
        "summary": summary,
        "filename": image_file.name,
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