import chromadb
from sentence_transformers import SentenceTransformer
from app.core import config
from typing import List, Dict, Any, Optional
import numpy as np

class LocalEmbedder:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            # Loads sentence transformer model locally (cached in standard cache dir)
            cls._model = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
        return cls._model

    @classmethod
    def embed_query(cls, text: str) -> List[float]:
        model = cls.get_model()
        embedding = model.encode(text)
        return embedding.tolist()

    @classmethod
    def embed_documents(cls, texts: List[str]) -> List[List[float]]:
        model = cls.get_model()
        embeddings = model.encode(texts)
        return [emb.tolist() for emb in embeddings]

class OKCVectorStore:
    def __init__(self, package_id: str):
        self.package_id = package_id
        # Initialize chroma client persisting to folder
        self.chroma_client = chromadb.PersistentClient(path=str(config.CHROMA_PERSIST_DIR))
        # Each OKC package gets its own collection
        # Replace dashes or dots to meet Chroma collection naming rules
        collection_name = f"okc_{package_id.replace('-', '_')}"
        self.collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Embeds and indexes parsed file chunks in Chroma.
        """
        if not chunks:
            return
            
        ids = []
        texts = []
        metadatas = []
        
        for chunk in chunks:
            ids.append(chunk["hash"])
            texts.append(chunk["text"])
            
            # Rebuild metadata ensuring no None values (Chroma requires primitive types)
            meta = {
                "source": chunk.get("source", ""),
                "page": chunk.get("page") if chunk.get("page") is not None else -1,
                "line": chunk.get("line") if chunk.get("line") is not None else -1,
                "timestamp": chunk.get("timestamp") if chunk.get("timestamp") is not None else "",
            }
            metadatas.append(meta)
            
        embeddings = LocalEmbedder.embed_documents(texts)
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Performs vector similarity search.
        """
        query_embedding = LocalEmbedder.embed_query(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit
        )
        
        hits = []
        if results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            ids = results["ids"][0]
            distances = results["distances"][0] if "distances" in results else [0.0]*len(docs)
            
            for i in range(len(docs)):
                hits.append({
                    "id": ids[i],
                    "text": docs[i],
                    "metadata": metas[i],
                    "score": float(1.0 - distances[i]) # Cosine similarity score
                })
        return hits
