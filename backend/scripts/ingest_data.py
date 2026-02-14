import os
import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
from rag.vector_store import VectorStore

CLEAN_DIR = os.path.join(BASE_DIR,"data","cleaned")

def chunk_text(text,size=500):
    return [text[i:i+size] for i in range(0,len(text),size)]

def load_docs():
    all_chunks = []

    for file in os.listdir(CLEAN_DIR):
        with open(os.path.join(CLEAN_DIR,file),"r",encoding="utf-8") as f:
            text = f.read()
            chunks = chunk_text(text)
            all_chunks.extend(chunks)
    
    return all_chunks

if __name__ == "__main__":
    docs = load_docs()
    vs = VectorStore()
    vs.build(docs)
    print("Indexed successfully")