import faiss
import pickle
from rag.embeddings import embed_text

VECTOR_PATH = "data/processed/faiss.index"
META_PATH = "data/processed/meta.pkl"


class VectorStore:

    def __init__(self):
        self.index = None
        self.documents = []

    def build(self, docs):
        embeddings = embed_text(docs)
        dim = embeddings.shape[1]

        self.index = faiss.IndexFlatL2(dim)
        self.index.add(embeddings)

        self.documents = docs

        faiss.write_index(self.index, VECTOR_PATH)

        with open(META_PATH, "wb") as f:
            pickle.dump(self.documents, f)

    def load(self):
        self.index = faiss.read_index(VECTOR_PATH)

        with open(META_PATH, "rb") as f:
            self.documents = pickle.load(f)

    def search(self, query, k=3):
        q_embedding = embed_text([query])
        distances, indices = self.index.search(q_embedding, k)

        return [self.documents[i] for i in indices[0]]
    