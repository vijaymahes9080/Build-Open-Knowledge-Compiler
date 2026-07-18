import os
from pathlib import Path

# Roots
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BACKEND_DIR.parent

# Storage configuration
UPLOAD_DIR = BACKEND_DIR / "data" / "uploads"
EXTRACT_DIR = BACKEND_DIR / "data" / "extracted"
CHROMA_PERSIST_DIR = BACKEND_DIR / "data" / "chroma"

# Create directories
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)

# Local AI Configurations
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "ollama/llama3")  # LiteLLM format: 'ollama/<model_name>'
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2") # Fast & clean locally

# General API settings
API_V1_STR = "/api/v1"
PROJECT_NAME = "Open Knowledge Compiler"
