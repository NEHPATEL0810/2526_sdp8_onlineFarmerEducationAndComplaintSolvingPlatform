from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_text(text):
    return model.encode(text, convert_to_numpy=True)

# def embed_corpus(texts):
#     return model.encode(texts, convert_to_numpy=True)

# if __name__ == "__main__":
#     texts = [
#         "What is the best fertilizer for wheat?",
#         "How to control pests in cotton?",
#         "When to sow paddy?",
#         "What is the market price of wheat?",
#         "How to control pests in cotton?",
#         "When to sow paddy?",
#         "What is the market price of wheat?",
#     ]
#     embeddings = embed_corpus(texts)
#     print(embeddings.shape)