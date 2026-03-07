# Image-Based Issue Detection — Walkthrough

## Summary
Added image analysis capability to the FarmEasy RAG chatbot. Users can now upload crop/plant/soil images and receive structured **Issue → Cause → Solution** analysis from Groq's Llama-4 Scout vision model, with vector relevance checking against the agricultural knowledge base.

---

## Changes Made

### Backend — [views.py](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py)

```diff:views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer, vector_store
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


def _summarize_text(client, filename, text, truncated, user_prompt=None):
    """Summarize extracted text via Groq text model."""
    req_text = user_prompt if user_prompt else "Please analyze this agricultural document and summarize it."
    prompt = (
        f"User Request: {req_text}\n\n"
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


def _summarize_images(client, filename, page_images, user_prompt=None):
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

    resp = client.chat.completions.create(
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
        results = vector_store.search(check_text, k=3, threshold=0.0) # get top 3 regardless of threshold
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
            summary = _summarize_text(client, pdf_file.name, truncated_text, was_truncated, user_prompt)
        except Exception as e:
            return Response({"error": f"LLM error: {str(e)}"}, status=500)
    else:
        try:
            summary = _summarize_images(client, pdf_file.name, page_images, user_prompt)
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
===
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rag.models import ChatSession, ChatMessage
from rag.rag_pipeline import get_answer, vector_store
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


def _summarize_text(client, filename, text, truncated, user_prompt=None):
    """Summarize extracted text via Groq text model."""
    req_text = user_prompt if user_prompt else "Please analyze this agricultural document and summarize it."
    prompt = (
        f"User Request: {req_text}\n\n"
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


def _summarize_images(client, filename, page_images, user_prompt=None):
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

    resp = client.chat.completions.create(
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
        results = vector_store.search(check_text, k=3, threshold=0.0) # get top 3 regardless of threshold
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
            summary = _summarize_text(client, pdf_file.name, truncated_text, was_truncated, user_prompt)
        except Exception as e:
            return Response({"error": f"LLM error: {str(e)}"}, status=500)
    else:
        try:
            summary = _summarize_images(client, pdf_file.name, page_images, user_prompt)
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
            desc_resp = client.chat.completions.create(
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
        results = vector_store.search(check_text, k=3, threshold=0.0)
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
        resp = client.chat.completions.create(
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
```

**New functions added:**
| Function | Purpose |
|---|---|
| [analyze_image(request)](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#358-477) | Main API endpoint — accepts image + prompt, runs relevance check, calls vision LLM |
| [_get_or_create_session()](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#306-324) | Helper to find or create a ChatSession |
| [_save_messages()](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#326-333) | Helper to save user/assistant message pair |

**Flow:**
1. Validate image type (JPG, PNG, WebP, GIF, BMP)
2. **Vector relevance check**: If user provides a prompt, embed it and search FAISS. If no prompt, ask vision model to describe the image first, then search. Reject if max score < 0.15.
3. **Vision LLM call**: Send base64 image + prompt to `llama-4-scout-17b-16e-instruct` with `IMAGE_ANALYSIS_SYSTEM_PROMPT` requesting Issue/Cause/Solution
4. Save to ChatSession and return structured response

### Frontend — [Chatbot.jsx](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/frontend/src/pages/Chatbot.jsx)

```diff:Chatbot.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, Plus, Trash2, Menu, X, Copy, Check,
    ChevronDown, Loader2, Pencil, FileText
} from 'lucide-react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API = 'http://localhost:8000/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Chatbot() {
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);
    const { isAuthenticated, user } = useAuth();

    const [chatSessions, setChatSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [expandedSources, setExpandedSources] = useState({});
    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (!isAuthenticated) navigate('/');
    }, [isAuthenticated, navigate]);

    // Load sessions on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get(`${API}/chat/sessions/`, { headers: authHeaders() })
            .then(res => {
                setChatSessions(res.data);
                if (res.data.length > 0) loadSession(res.data[0].session_id);
            })
            .catch(() => { });
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const loadSession = useCallback(async (sessionId) => {
        setCurrentSessionId(sessionId);
        setMessages([]);
        setEditingMessageId(null);
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setMessages(res.data.messages);
        } catch {
            setMessages([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    const handleNewChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([]);
        setEditingMessageId(null);
    }, []);

    const handleSwitchChat = useCallback((sessionId) => {
        if (sessionId === currentSessionId) return;
        loadSession(sessionId);
    }, [currentSessionId, loadSession]);

    const handleDeleteChat = useCallback(async (sessionId, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (sessionId === currentSessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch { }
    }, [currentSessionId]);

    const handleCopyMessage = useCallback((content, messageId) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }, []);

    // ── Edit message ──────────────────────────────────────────────────────────
    const startEdit = useCallback((message) => {
        setEditingMessageId(message.id);
        setEditText(message.content);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditText('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editText.trim()) return;
        const msgIndex = messages.findIndex(m => m.id === editingMessageId);
        if (msgIndex === -1) return;

        // Keep only messages up to (not including) the edited one, replace with edited version
        const trimmed = messages.slice(0, msgIndex);
        const editedUserMsg = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: editText,
            timestamp: new Date().toISOString(),
        };
        setMessages([...trimmed, editedUserMsg]);
        setEditingMessageId(null);
        setEditText('');
        setIsGenerating(true);

        try {
            const res = await axios.post(`${API}/chat/`, {
                question: editText,
                session_id: currentSessionId,
            }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

            const { answer, retrieved, confidence } = res.data;
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: answer,
                retrieved,
                confidence,
                timestamp: new Date().toISOString(),
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                isError: true,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsGenerating(false);
        }
    }, [editText, editingMessageId, messages, currentSessionId]);

    // ── Send message (with PDF detection) ─────────────────────────────────────
    const handleSendMessage = useCallback(async ({ input, attachments: msgAttachments }) => {
        if (!input.trim() && msgAttachments.length === 0) return;

        // Detect PDF attachments
        const pdfAttachments = msgAttachments.filter(a =>
            a.name?.toLowerCase().endsWith('.pdf') || a.contentType === 'application/pdf'
        );
        const otherAttachments = msgAttachments.filter(a =>
            !a.name?.toLowerCase().endsWith('.pdf') && a.contentType !== 'application/pdf'
        );

        // ── Case: PDF uploaded ─────────────────────────────────────────────
        if (pdfAttachments.length > 0) {
            for (const pdfAtt of pdfAttachments) {
                const userMsg = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content: input || `Please analyze and summarize this document.`,
                    attachments: [pdfAtt],
                    isPdfUpload: true,
                    pdfName: pdfAtt.name,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, userMsg]);
                setIsGenerating(true);

                try {
                    // Fetch the actual file blob from the blob URL
                    const blobRes = await fetch(pdfAtt.url);
                    const blob = await blobRes.blob();
                    const file = new File([blob], pdfAtt.name, { type: 'application/pdf' });

                    const formData = new FormData();
                    formData.append('file', file);
                    if (input.trim()) formData.append('prompt', input.trim());
                    if (currentSessionId) formData.append('session_id', currentSessionId);

                    const res = await axios.post(`${API}/chat/analyze-pdf/`, formData, {
                        headers: { ...authHeaders() },
                    });

                    const { summary, filename, pages, truncated, used_ocr, session_id, title } = res.data;

                    if (!currentSessionId) {
                        setCurrentSessionId(session_id);
                        setChatSessions(prev => [{
                            session_id,
                            title,
                            last_message: summary.substring(0, 80),
                            updated_at: new Date().toISOString(),
                        }, ...prev]);
                    }

                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-pdf-ai`,
                        role: 'assistant',
                        content: summary,
                        confidence: 'HIGH',
                        isPdfSummary: true,
                        pdfFilename: filename,
                        pdfPages: pages,
                        pdfTruncated: truncated,
                        pdfUsedOcr: used_ocr,
                        timestamp: new Date().toISOString(),
                    }]);
                } catch (err) {
                    const errMsg = err.response?.data?.error || 'Could not analyze PDF. Please try again.';
                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-pdf-error`,
                        role: 'assistant',
                        content: errMsg,
                        isError: true,
                        timestamp: new Date().toISOString(),
                    }]);
                } finally {
                    setIsGenerating(false);
                }
            }
            // If there was also text input with non-pdf attachments, fall through
            if (!input.trim() && otherAttachments.length === 0) return;
        }

        // ── Case: Normal text message ──────────────────────────────────────
        if (input.trim() || otherAttachments.length > 0) {
            const tempId = `msg-${Date.now()}`;
            setMessages(prev => [...prev, {
                id: tempId,
                role: 'user',
                content: input,
                attachments: otherAttachments,
                timestamp: new Date().toISOString(),
            }]);
            setIsGenerating(true);

            try {
                const res = await axios.post(`${API}/chat/`, {
                    question: input,
                    session_id: currentSessionId,
                }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

                const { answer, retrieved, confidence, session_id, title } = res.data;

                if (!currentSessionId) {
                    setCurrentSessionId(session_id);
                    setChatSessions(prev => [{
                        session_id,
                        title: title || input.substring(0, 60),
                        last_message: answer.substring(0, 80),
                        updated_at: new Date().toISOString(),
                    }, ...prev]);
                } else {
                    setChatSessions(prev => prev.map(s =>
                        s.session_id === session_id
                            ? { ...s, last_message: answer.substring(0, 80), updated_at: new Date().toISOString() }
                            : s
                    ));
                }

                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-ai`,
                    role: 'assistant',
                    content: answer,
                    retrieved,
                    confidence,
                    timestamp: new Date().toISOString(),
                }]);
            } catch {
                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-error`,
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    isError: true,
                    timestamp: new Date().toISOString(),
                }]);
            } finally {
                setIsGenerating(false);
            }
        }
    }, [currentSessionId]);

    const handleStopGenerating = useCallback(() => setIsGenerating(false), []);

    if (!isAuthenticated) return null;

    return (
        <>
            <Navbar />
            <div style={{ paddingTop: '72px', height: '100vh', backgroundColor: '#ffffc5', display: 'flex', overflow: 'hidden' }}>

                {/* ── Sidebar ── */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="w-70 bg-white border-r-2 flex flex-col"
                            style={{ borderColor: '#4ade80', height: 'calc(100vh - 72px)' }}
                        >
                            <div className="p-4 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                >
                                    <Plus size={20} /> New Chat
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {chatSessions.length === 0 && (
                                    <p className="text-xs text-center mt-6" style={{ color: '#9ca3af' }}>No previous chats</p>
                                )}
                                {chatSessions.map(chat => (
                                    <motion.div
                                        key={chat.session_id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSwitchChat(chat.session_id)}
                                        className="group relative p-3 mb-2 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            backgroundColor: chat.session_id === currentSessionId ? '#f0fdf4' : 'transparent',
                                            border: chat.session_id === currentSessionId ? '1px solid #4ade80' : '1px solid transparent',
                                        }}
                                        onMouseEnter={e => { if (chat.session_id !== currentSessionId) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                        onMouseLeave={e => { if (chat.session_id !== currentSessionId) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare size={16} className="mt-1 flex-shrink-0" style={{ color: '#16a34a' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate" style={{ color: '#1f2937' }}>{chat.title}</div>
                                                {chat.last_message && (
                                                    <div className="text-xs truncate mt-1" style={{ color: '#6b7280' }}>{chat.last_message}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={e => handleDeleteChat(chat.session_id, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                                                style={{ color: '#dc2626' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="p-4 border-t-2" style={{ borderColor: '#e5e7eb' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#16a34a' }}>
                                        {user?.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="text-sm font-medium" style={{ color: '#1f2937' }}>{user?.username || 'User'}</div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main Chat Area ── */}
                <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>
                    <div className="flex items-center gap-3 p-4 bg-white border-b-2" style={{ borderColor: '#e5e7eb' }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <h2 className="text-lg font-semibold" style={{ color: '#15803d' }}>🌾 FarmEasy AI Assistant</h2>
                    </div>

                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto"
                        style={{
                            backgroundColor: '#ffffc5',
                            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(74,222,128,0.05) 0%,transparent 50%), radial-gradient(circle at 80% 70%, rgba(22,163,74,0.05) 0%,transparent 50%)',
                        }}
                    >
                        <div className="max-w-4xl mx-auto px-4 py-6">
                            {loadingHistory && (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a' }} />
                                </div>
                            )}

                            {!loadingHistory && messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center text-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <div>
                                        <div className="text-8xl mb-6">🌱</div>
                                        <h3 className="text-2xl font-bold mb-3" style={{ color: '#15803d' }}>Welcome, {user?.username || 'Farmer'}!</h3>
                                        <p className="text-gray-700 max-w-md mx-auto">
                                            Ask me anything about crops, pest management, soil health, or farming best practices!
                                            You can also <strong>upload a PDF</strong> to get an instant summary.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {!loadingHistory && messages.length > 0 && (
                                <div className="space-y-6 pb-4">
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {/* ── User message ─────────────────── */}
                                                {message.role === 'user' && (
                                                    <div className="group relative max-w-[85%] flex flex-col items-end gap-1">
                                                        {/* Edit mode */}
                                                        {editingMessageId === message.id ? (
                                                            <div className="w-full" style={{ minWidth: '320px' }}>
                                                                <textarea
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    className="w-full rounded-2xl px-4 py-3 text-sm resize-none border-2 focus:outline-none"
                                                                    style={{ borderColor: '#16a34a', minHeight: '80px', color: '#1f2937' }}
                                                                    autoFocus
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                                                        if (e.key === 'Escape') cancelEdit();
                                                                    }}
                                                                />
                                                                <div className="flex gap-2 mt-1 justify-end">
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        className="text-xs px-3 py-1 rounded-lg border"
                                                                        style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                                                                    >Cancel</button>
                                                                    <button
                                                                        onClick={saveEdit}
                                                                        className="text-xs px-3 py-1 rounded-lg text-white"
                                                                        style={{ backgroundColor: '#16a34a' }}
                                                                    >Save & Resend</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    className="rounded-3xl px-5 py-3 shadow-md"
                                                                    style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                                                                >
                                                                    {/* PDF badge */}
                                                                    {message.isPdfUpload && (
                                                                        <div className="flex items-center gap-1 mb-2 text-xs opacity-80">
                                                                            <FileText size={12} /> {message.pdfName}
                                                                        </div>
                                                                    )}
                                                                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                                        {message.content}
                                                                    </div>
                                                                    <div className="text-xs opacity-60 mt-1">
                                                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                                {/* Edit button — only for non-PDF messages */}
                                                                {!message.isPdfUpload && (
                                                                    <button
                                                                        onClick={() => startEdit(message)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                                                        title="Edit message"
                                                                        style={{ color: '#6b7280' }}
                                                                    >
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ── Assistant message ────────────── */}
                                                {message.role === 'assistant' && (
                                                    <div
                                                        className={`group relative max-w-[85%] rounded-2xl px-5 py-4 shadow-lg`}
                                                        style={{
                                                            backgroundColor: message.isError ? '#fee2e2' : '#ffffff',
                                                            color: '#1f2937',
                                                            border: !message.isError ? '1px solid #e5e7eb' : 'none',
                                                        }}
                                                    >
                                                        {/* Header: name + confidence */}
                                                        {!message.isError && (
                                                            <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                                                                        {message.isPdfSummary ? <FileText size={14} style={{ color: '#16a34a' }} /> : <span className="text-sm">🤖</span>}
                                                                    </div>
                                                                    <span className="font-semibold text-sm" style={{ color: '#15803d' }}>
                                                                        {message.isPdfSummary ? `PDF Summary` : 'FarmEasy AI'}
                                                                    </span>
                                                                    {message.isPdfSummary && (
                                                                        <span className="text-xs" style={{ color: '#6b7280' }}>
                                                                            · {message.pdfFilename} ({message.pdfPages}p{message.pdfTruncated ? ', truncated' : ''})
                                                                        </span>
                                                                    )}
                                                                    {message.pdfUsedOcr && (
                                                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                                                            🔍 OCR
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {message.confidence && (
                                                                    <span
                                                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                        style={{
                                                                            backgroundColor: message.confidence === 'HIGH' ? '#dcfce7' : message.confidence === 'MEDIUM' ? '#fef9c3' : '#fee2e2',
                                                                            color: message.confidence === 'HIGH' ? '#15803d' : message.confidence === 'MEDIUM' ? '#854d0e' : '#991b1b',
                                                                        }}
                                                                    >
                                                                        {message.confidence === 'HIGH' ? '✓ High Confidence' : message.confidence === 'MEDIUM' ? '~ Medium Confidence' : '⚠ Low Confidence'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Message text */}
                                                        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                            {message.content}
                                                        </div>

                                                        {/* Sources panel removed by user request (only keeping confidence badge) */}

                                                        {/* Timestamp + copy */}
                                                        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                            <div className="text-xs opacity-60">
                                                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            {!message.isError && (
                                                                <button
                                                                    onClick={() => handleCopyMessage(message.content, message.id)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-100"
                                                                    title="Copy message"
                                                                >
                                                                    {copiedMessageId === message.id
                                                                        ? <Check size={14} style={{ color: 'white' }} />
                                                                        : <Copy size={14} style={{ color: 'white' }} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                            <div className="rounded-2xl px-5 py-4 shadow-lg bg-white">
                                                <div className="flex gap-2">
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="bg-white border-t-2 p-4" style={{ borderColor: '#e5e7eb' }}>
                        <div className="max-w-4xl mx-auto">
                            <PureMultimodalInput
                                chatId={currentSessionId || 'new'}
                                messages={messages}
                                attachments={attachments}
                                setAttachments={setAttachments}
                                onSendMessage={handleSendMessage}
                                onStopGenerating={handleStopGenerating}
                                isGenerating={isGenerating}
                                canSend={!isGenerating}
                                selectedVisibilityType="private"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
===
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, Plus, Trash2, Menu, X, Copy, Check,
    ChevronDown, Loader2, Pencil, FileText, Image
} from 'lucide-react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API = 'http://localhost:8000/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Chatbot() {
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);
    const { isAuthenticated, user } = useAuth();

    const [chatSessions, setChatSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [expandedSources, setExpandedSources] = useState({});
    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (!isAuthenticated) navigate('/');
    }, [isAuthenticated, navigate]);

    // Load sessions on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get(`${API}/chat/sessions/`, { headers: authHeaders() })
            .then(res => {
                setChatSessions(res.data);
                if (res.data.length > 0) loadSession(res.data[0].session_id);
            })
            .catch(() => { });
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const loadSession = useCallback(async (sessionId) => {
        setCurrentSessionId(sessionId);
        setMessages([]);
        setEditingMessageId(null);
        setLoadingHistory(true);
        try {
            const res = await axios.get(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setMessages(res.data.messages);
        } catch {
            setMessages([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    const handleNewChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([]);
        setEditingMessageId(null);
    }, []);

    const handleSwitchChat = useCallback((sessionId) => {
        if (sessionId === currentSessionId) return;
        loadSession(sessionId);
    }, [currentSessionId, loadSession]);

    const handleDeleteChat = useCallback(async (sessionId, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (sessionId === currentSessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch { }
    }, [currentSessionId]);

    const handleCopyMessage = useCallback((content, messageId) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }, []);

    // ── Edit message ──────────────────────────────────────────────────────────
    const startEdit = useCallback((message) => {
        setEditingMessageId(message.id);
        setEditText(message.content);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditText('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editText.trim()) return;
        const msgIndex = messages.findIndex(m => m.id === editingMessageId);
        if (msgIndex === -1) return;

        // Keep only messages up to (not including) the edited one, replace with edited version
        const trimmed = messages.slice(0, msgIndex);
        const editedUserMsg = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: editText,
            timestamp: new Date().toISOString(),
        };
        setMessages([...trimmed, editedUserMsg]);
        setEditingMessageId(null);
        setEditText('');
        setIsGenerating(true);

        try {
            const res = await axios.post(`${API}/chat/`, {
                question: editText,
                session_id: currentSessionId,
            }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

            const { answer, retrieved, confidence } = res.data;
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: answer,
                retrieved,
                confidence,
                timestamp: new Date().toISOString(),
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                isError: true,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsGenerating(false);
        }
    }, [editText, editingMessageId, messages, currentSessionId]);

    // ── Send message (with PDF detection) ─────────────────────────────────────
    const handleSendMessage = useCallback(async ({ input, attachments: msgAttachments }) => {
        if (!input.trim() && msgAttachments.length === 0) return;

        // Classify attachments
        const pdfAttachments = msgAttachments.filter(a =>
            a.name?.toLowerCase().endsWith('.pdf') || a.contentType === 'application/pdf'
        );
        const imageAttachments = msgAttachments.filter(a =>
            a.contentType?.startsWith('image/')
        );
        const otherAttachments = msgAttachments.filter(a =>
            !a.name?.toLowerCase().endsWith('.pdf') &&
            a.contentType !== 'application/pdf' &&
            !a.contentType?.startsWith('image/')
        );

        // ── Case: PDF uploaded ─────────────────────────────────────────────
        if (pdfAttachments.length > 0) {
            for (const pdfAtt of pdfAttachments) {
                const userMsg = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content: input || `Please analyze and summarize this document.`,
                    attachments: [pdfAtt],
                    isPdfUpload: true,
                    pdfName: pdfAtt.name,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, userMsg]);
                setIsGenerating(true);

                try {
                    const blobRes = await fetch(pdfAtt.url);
                    const blob = await blobRes.blob();
                    const file = new File([blob], pdfAtt.name, { type: 'application/pdf' });

                    const formData = new FormData();
                    formData.append('file', file);
                    if (input.trim()) formData.append('prompt', input.trim());
                    if (currentSessionId) formData.append('session_id', currentSessionId);

                    const res = await axios.post(`${API}/chat/analyze-pdf/`, formData, {
                        headers: { ...authHeaders() },
                    });

                    const { summary, filename, pages, truncated, used_ocr, session_id, title } = res.data;

                    if (!currentSessionId) {
                        setCurrentSessionId(session_id);
                        setChatSessions(prev => [{
                            session_id, title,
                            last_message: summary.substring(0, 80),
                            updated_at: new Date().toISOString(),
                        }, ...prev]);
                    }

                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-pdf-ai`,
                        role: 'assistant',
                        content: summary,
                        confidence: 'HIGH',
                        isPdfSummary: true,
                        pdfFilename: filename,
                        pdfPages: pages,
                        pdfTruncated: truncated,
                        pdfUsedOcr: used_ocr,
                        timestamp: new Date().toISOString(),
                    }]);
                } catch (err) {
                    const errMsg = err.response?.data?.error || 'Could not analyze PDF. Please try again.';
                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-pdf-error`,
                        role: 'assistant',
                        content: errMsg,
                        isError: true,
                        timestamp: new Date().toISOString(),
                    }]);
                } finally {
                    setIsGenerating(false);
                }
            }
            if (!input.trim() && imageAttachments.length === 0 && otherAttachments.length === 0) return;
        }

        // ── Case: Image uploaded ───────────────────────────────────────────
        if (imageAttachments.length > 0) {
            for (const imgAtt of imageAttachments) {
                const userMsg = {
                    id: `msg-${Date.now()}-img`,
                    role: 'user',
                    content: input || 'Analyze this image.',
                    attachments: [imgAtt],
                    isImageUpload: true,
                    imageName: imgAtt.name,
                    imagePreviewUrl: imgAtt.url,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, userMsg]);
                setIsGenerating(true);

                try {
                    const blobRes = await fetch(imgAtt.url);
                    const blob = await blobRes.blob();
                    const file = new File([blob], imgAtt.name, { type: imgAtt.contentType || 'image/jpeg' });

                    const formData = new FormData();
                    formData.append('image', file);
                    if (input.trim()) formData.append('prompt', input.trim());
                    if (currentSessionId) formData.append('session_id', currentSessionId);

                    const res = await axios.post(`${API}/chat/analyze-image/`, formData, {
                        headers: { ...authHeaders() },
                    });

                    const { summary, filename, session_id, title } = res.data;

                    if (!currentSessionId) {
                        setCurrentSessionId(session_id);
                        setChatSessions(prev => [{
                            session_id, title,
                            last_message: summary.substring(0, 80),
                            updated_at: new Date().toISOString(),
                        }, ...prev]);
                    } else {
                        setChatSessions(prev => prev.map(s =>
                            s.session_id === session_id
                                ? { ...s, last_message: summary.substring(0, 80), updated_at: new Date().toISOString() }
                                : s
                        ));
                    }

                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-img-ai`,
                        role: 'assistant',
                        content: summary,
                        confidence: 'HIGH',
                        isImageAnalysis: true,
                        imageFilename: filename,
                        timestamp: new Date().toISOString(),
                    }]);
                } catch (err) {
                    const errMsg = err.response?.data?.error || 'Could not analyze image. Please try again.';
                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-img-error`,
                        role: 'assistant',
                        content: errMsg,
                        isError: true,
                        timestamp: new Date().toISOString(),
                    }]);
                } finally {
                    setIsGenerating(false);
                }
            }
            if (!input.trim() && otherAttachments.length === 0) return;
        }

        // ── Case: Normal text message ──────────────────────────────────────
        if (input.trim() || otherAttachments.length > 0) {
            const tempId = `msg-${Date.now()}`;
            setMessages(prev => [...prev, {
                id: tempId,
                role: 'user',
                content: input,
                attachments: otherAttachments,
                timestamp: new Date().toISOString(),
            }]);
            setIsGenerating(true);

            try {
                const res = await axios.post(`${API}/chat/`, {
                    question: input,
                    session_id: currentSessionId,
                }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

                const { answer, retrieved, confidence, session_id, title } = res.data;

                if (!currentSessionId) {
                    setCurrentSessionId(session_id);
                    setChatSessions(prev => [{
                        session_id,
                        title: title || input.substring(0, 60),
                        last_message: answer.substring(0, 80),
                        updated_at: new Date().toISOString(),
                    }, ...prev]);
                } else {
                    setChatSessions(prev => prev.map(s =>
                        s.session_id === session_id
                            ? { ...s, last_message: answer.substring(0, 80), updated_at: new Date().toISOString() }
                            : s
                    ));
                }

                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-ai`,
                    role: 'assistant',
                    content: answer,
                    retrieved,
                    confidence,
                    timestamp: new Date().toISOString(),
                }]);
            } catch {
                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-error`,
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    isError: true,
                    timestamp: new Date().toISOString(),
                }]);
            } finally {
                setIsGenerating(false);
            }
        }
    }, [currentSessionId]);

    const handleStopGenerating = useCallback(() => setIsGenerating(false), []);

    if (!isAuthenticated) return null;

    return (
        <>
            <Navbar />
            <div style={{ paddingTop: '72px', height: '100vh', backgroundColor: '#ffffc5', display: 'flex', overflow: 'hidden' }}>

                {/* ── Sidebar ── */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="w-70 bg-white border-r-2 flex flex-col"
                            style={{ borderColor: '#4ade80', height: 'calc(100vh - 72px)' }}
                        >
                            <div className="p-4 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                >
                                    <Plus size={20} /> New Chat
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {chatSessions.length === 0 && (
                                    <p className="text-xs text-center mt-6" style={{ color: '#9ca3af' }}>No previous chats</p>
                                )}
                                {chatSessions.map(chat => (
                                    <motion.div
                                        key={chat.session_id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSwitchChat(chat.session_id)}
                                        className="group relative p-3 mb-2 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            backgroundColor: chat.session_id === currentSessionId ? '#f0fdf4' : 'transparent',
                                            border: chat.session_id === currentSessionId ? '1px solid #4ade80' : '1px solid transparent',
                                        }}
                                        onMouseEnter={e => { if (chat.session_id !== currentSessionId) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                        onMouseLeave={e => { if (chat.session_id !== currentSessionId) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare size={16} className="mt-1 flex-shrink-0" style={{ color: '#16a34a' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate" style={{ color: '#1f2937' }}>{chat.title}</div>
                                                {chat.last_message && (
                                                    <div className="text-xs truncate mt-1" style={{ color: '#6b7280' }}>{chat.last_message}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={e => handleDeleteChat(chat.session_id, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                                                style={{ color: '#dc2626' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="p-4 border-t-2" style={{ borderColor: '#e5e7eb' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#16a34a' }}>
                                        {user?.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="text-sm font-medium" style={{ color: '#1f2937' }}>{user?.username || 'User'}</div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main Chat Area ── */}
                <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>
                    <div className="flex items-center gap-3 p-4 bg-white border-b-2" style={{ borderColor: '#e5e7eb' }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <h2 className="text-lg font-semibold" style={{ color: '#15803d' }}>🌾 FarmEasy AI Assistant</h2>
                    </div>

                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto"
                        style={{
                            backgroundColor: '#ffffc5',
                            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(74,222,128,0.05) 0%,transparent 50%), radial-gradient(circle at 80% 70%, rgba(22,163,74,0.05) 0%,transparent 50%)',
                        }}
                    >
                        <div className="max-w-4xl mx-auto px-4 py-6">
                            {loadingHistory && (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a' }} />
                                </div>
                            )}

                            {!loadingHistory && messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center text-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <div>
                                        <div className="text-8xl mb-6">🌱</div>
                                        <h3 className="text-2xl font-bold mb-3" style={{ color: '#15803d' }}>Welcome, {user?.username || 'Farmer'}!</h3>
                                        <p className="text-gray-700 max-w-md mx-auto">
                                            Ask me anything about crops, pest management, soil health, or farming best practices!
                                            You can also <strong>upload a PDF</strong> to get an instant summary or <strong>upload an image</strong> of your crop/soil issue to get a diagnosis.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {!loadingHistory && messages.length > 0 && (
                                <div className="space-y-6 pb-4">
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {/* ── User message ─────────────────── */}
                                                {message.role === 'user' && (
                                                    <div className="group relative max-w-[85%] flex flex-col items-end gap-1">
                                                        {/* Edit mode */}
                                                        {editingMessageId === message.id ? (
                                                            <div className="w-full" style={{ minWidth: '320px' }}>
                                                                <textarea
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    className="w-full rounded-2xl px-4 py-3 text-sm resize-none border-2 focus:outline-none"
                                                                    style={{ borderColor: '#16a34a', minHeight: '80px', color: '#1f2937' }}
                                                                    autoFocus
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                                                        if (e.key === 'Escape') cancelEdit();
                                                                    }}
                                                                />
                                                                <div className="flex gap-2 mt-1 justify-end">
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        className="text-xs px-3 py-1 rounded-lg border"
                                                                        style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                                                                    >Cancel</button>
                                                                    <button
                                                                        onClick={saveEdit}
                                                                        className="text-xs px-3 py-1 rounded-lg text-white"
                                                                        style={{ backgroundColor: '#16a34a' }}
                                                                    >Save & Resend</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    className="rounded-3xl px-5 py-3 shadow-md"
                                                                    style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                                                                >
                                                                    {/* PDF badge */}
                                                                    {message.isPdfUpload && (
                                                                        <div className="flex items-center gap-1 mb-2 text-xs opacity-80">
                                                                            <FileText size={12} /> {message.pdfName}
                                                                        </div>
                                                                    )}
                                                                    {/* Image badge */}
                                                                    {message.isImageUpload && (
                                                                        <div className="flex items-center gap-1 mb-2 text-xs opacity-80">
                                                                            <Image size={12} /> {message.imageName}
                                                                        </div>
                                                                    )}
                                                                    {/* Image thumbnail */}
                                                                    {message.isImageUpload && message.imagePreviewUrl && (
                                                                        <img
                                                                            src={message.imagePreviewUrl}
                                                                            alt={message.imageName}
                                                                            className="rounded-lg mb-2 max-w-[200px] max-h-[150px] object-cover border border-white/30"
                                                                        />
                                                                    )}
                                                                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                                        {message.content}
                                                                    </div>
                                                                    <div className="text-xs opacity-60 mt-1">
                                                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                                {/* Edit button — only for non-PDF messages */}
                                                                {!message.isPdfUpload && (
                                                                    <button
                                                                        onClick={() => startEdit(message)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                                                        title="Edit message"
                                                                        style={{ color: '#6b7280' }}
                                                                    >
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ── Assistant message ────────────── */}
                                                {message.role === 'assistant' && (
                                                    <div
                                                        className={`group relative max-w-[85%] rounded-2xl px-5 py-4 shadow-lg`}
                                                        style={{
                                                            backgroundColor: message.isError ? '#fee2e2' : '#ffffff',
                                                            color: '#1f2937',
                                                            border: !message.isError ? '1px solid #e5e7eb' : 'none',
                                                        }}
                                                    >
                                                        {/* Header: name + confidence */}
                                                        {!message.isError && (
                                                            <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                                                                        {message.isPdfSummary
                                                                            ? <FileText size={14} style={{ color: '#16a34a' }} />
                                                                            : message.isImageAnalysis
                                                                                ? <Image size={14} style={{ color: '#16a34a' }} />
                                                                                : <span className="text-sm">🤖</span>}
                                                                    </div>
                                                                    <span className="font-semibold text-sm" style={{ color: '#15803d' }}>
                                                                        {message.isPdfSummary ? 'PDF Summary'
                                                                            : message.isImageAnalysis ? '📷 Image Analysis'
                                                                            : 'FarmEasy AI'}
                                                                    </span>
                                                                    {message.isPdfSummary && (
                                                                        <span className="text-xs" style={{ color: '#6b7280' }}>
                                                                            · {message.pdfFilename} ({message.pdfPages}p{message.pdfTruncated ? ', truncated' : ''})
                                                                        </span>
                                                                    )}
                                                                    {message.isImageAnalysis && (
                                                                        <span className="text-xs" style={{ color: '#6b7280' }}>
                                                                            · {message.imageFilename}
                                                                        </span>
                                                                    )}
                                                                    {message.pdfUsedOcr && (
                                                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                                                            🔍 OCR
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {message.confidence && (
                                                                    <span
                                                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                        style={{
                                                                            backgroundColor: message.confidence === 'HIGH' ? '#dcfce7' : message.confidence === 'MEDIUM' ? '#fef9c3' : '#fee2e2',
                                                                            color: message.confidence === 'HIGH' ? '#15803d' : message.confidence === 'MEDIUM' ? '#854d0e' : '#991b1b',
                                                                        }}
                                                                    >
                                                                        {message.confidence === 'HIGH' ? '✓ High Confidence' : message.confidence === 'MEDIUM' ? '~ Medium Confidence' : '⚠ Low Confidence'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Message text */}
                                                        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                            {message.content}
                                                        </div>

                                                        {/* Sources panel removed by user request (only keeping confidence badge) */}

                                                        {/* Timestamp + copy */}
                                                        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                            <div className="text-xs opacity-60">
                                                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            {!message.isError && (
                                                                <button
                                                                    onClick={() => handleCopyMessage(message.content, message.id)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-100"
                                                                    title="Copy message"
                                                                >
                                                                    {copiedMessageId === message.id
                                                                        ? <Check size={14} style={{ color: 'white' }} />
                                                                        : <Copy size={14} style={{ color: 'white' }} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                            <div className="rounded-2xl px-5 py-4 shadow-lg bg-white">
                                                <div className="flex gap-2">
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="bg-white border-t-2 p-4" style={{ borderColor: '#e5e7eb' }}>
                        <div className="max-w-4xl mx-auto">
                            <PureMultimodalInput
                                chatId={currentSessionId || 'new'}
                                messages={messages}
                                attachments={attachments}
                                setAttachments={setAttachments}
                                onSendMessage={handleSendMessage}
                                onStopGenerating={handleStopGenerating}
                                isGenerating={isGenerating}
                                canSend={!isGenerating}
                                selectedVisibilityType="private"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
```

**Key changes:**
- Attachments now classified into 3 categories: `pdfAttachments`, `imageAttachments`, `otherAttachments`
- New image upload handler POSTs `FormData` (image + prompt + session_id) to `/api/chat/analyze-image/`
- User messages show image thumbnail preview + 📷 filename badge
- Assistant responses show **📷 Image Analysis** header badge with filename
- Welcome message updated to mention image upload capability

### Data Extraction
- ✅ `archive (9).zip` (235MB) → extracted `flowers` dataset
- ⏳ `archive (8).zip` (2.8GB, 175K files) → extracting in background via Python with `\\?\` long path prefix (Windows 260-char limit workaround)

---

## Verification

| Check | Result |
|---|---|
| [views.py](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py) syntax | ✅ `py_compile` passed |
| [views.py](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py) functions | ✅ AST confirms: [farmer_chat](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#21-69), [_summarize_text](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#91-109), [_summarize_images](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#111-146), [analyze_pdf](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#151-300), [_get_or_create_session](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#306-324), [_save_messages](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#326-333), [analyze_image](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#358-477), [list_sessions](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#305-321), [session_detail](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/views.py#326-369) |
| [rag/urls.py](file:///c:/Users/Admin/OneDrive/Desktop/NEH/BTECH_CE/SEM%20VI/FarmEasy/2526_sdp8_onlineFarmerEducationAndComplaintSolvingPlatform/backend/rag/urls.py) route | ✅ Already had `path("chat/analyze-image/", views.analyze_image)` |
| Frontend import | ✅ `Image` icon imported from lucide-react |

### Manual Testing Steps
1. Start backend: `python manage.py runserver` (from `backend/`)
2. Start frontend: `npm run dev` (from `frontend/`)
3. Open chatbot → attach a sample image from `data/raw/image_datasets/` → type a prompt → send
4. Verify 📷 Image Analysis badge appears with Issue/Cause/Solution response
