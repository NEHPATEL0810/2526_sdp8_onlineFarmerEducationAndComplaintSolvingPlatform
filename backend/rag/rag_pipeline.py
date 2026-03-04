"""
RAG pipeline: retrieval, re-ranking, and LLM answer generation.
"""
from rag.vector_store import VectorStore
from rag.prompts import FARMER_SYSTEM_PROMPT, FARMER_USER_PROMPT
from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

vector_store = VectorStore()
vector_store.load()

# Number of candidates to retrieve before re-ranking
RETRIEVE_K = 5
# Maximum number of chunks to include in the final context
TOP_N = 3
# Below this many relevant chunks, flag as low confidence
LOW_CONFIDENCE_THRESHOLD = 2


def _format_context(results):
    """Format retrieved chunks into a context string with source citations."""
    blocks = []
    for i, r in enumerate(results, 1):
        meta = r.get("metadata", {})
        source = meta.get("source", "Unknown")
        category = meta.get("category", "")
        page = meta.get("page", "")

        header = f"[Chunk {i} | Source: {source}"
        if category:
            header += f" | Category: {category}"
        if page:
            header += f" | Page: {page}"
        header += f" | Relevance: {r['score']:.2f}]"

        blocks.append(f"{header}\n{r['text']}")

    return "\n\n".join(blocks)


def _determine_confidence(results):
    """Determine confidence level based on retrieval quality."""
    if len(results) == 0:
        return "LOW"
    avg_score = sum(r["score"] for r in results) / len(results)
    if len(results) >= LOW_CONFIDENCE_THRESHOLD and avg_score > 0.45:
        return "HIGH"
    if len(results) >= 1 and avg_score > 0.30:
        return "MEDIUM"
    return "LOW"


def get_answer(question):
    """
    Full RAG pipeline:
    1. Retrieve k=5 candidates from vector store
    2. Take top 3 by score (already filtered by threshold in vector_store)
    3. Format context with metadata
    4. Generate answer with system + user prompts
    5. Return answer, retrieved chunks with metadata, and confidence level
    """
    # --- Retrieve & re-rank ---
    results = vector_store.search(question, k=RETRIEVE_K)

    # Take the top-N (already sorted by score from FAISS)
    top_results = results[:TOP_N]

    # --- Determine confidence ---
    confidence = _determine_confidence(top_results)

    # --- Format context ---
    context = _format_context(top_results)

    if not context.strip():
        context = "No relevant information was found in the knowledge base."

    # --- Build prompt ---
    user_prompt = FARMER_USER_PROMPT.format(
        context=context,
        question=question,
    )

    # --- Call LLM ---
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": FARMER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.15,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content

    # --- Build structured retrieved data ---
    retrieved = [
        {
            "text": r["text"][:300],           # truncated for API response
            "score": round(r["score"], 3),
            "source": r.get("metadata", {}).get("source", "Unknown"),
            "category": r.get("metadata", {}).get("category", ""),
        }
        for r in top_results
    ]

    return answer, retrieved, confidence
