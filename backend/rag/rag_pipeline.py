from rag.vector_store import VectorStore
from rag.prompts import FARMER_RAG_PROMPT
from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

vector_store = VectorStore()
vector_store.load()

def get_answer(question):
    retrieved_docs = vector_store.search(question, k=3)
    context = "\n\n".join(retrieved_docs)

    prompt = FARMER_RAG_PROMPT.format(
        context=context,
        question=question
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    answer = response.choices[0].message.content
    return answer, retrieved_docs
