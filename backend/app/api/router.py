import os
import requests

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.documents import router as documents_router
from app.services.retrieval.rag_service import generate_answer
from app.services.retrieval.qdrant_service import (
    check_qdrant_connection,
)


router = APIRouter()


# ============================================================
# Configuration
# ============================================================

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434"
)


# ============================================================
# Documents API
# ============================================================

router.include_router(documents_router)


# ============================================================
# Query API
# ============================================================

class QueryRequest(BaseModel):
    question: str
    filename: str | None = None


@router.post(
    "/query",
    summary="Query Document",
    description="Query the uploaded documents using the RAG pipeline."
)
def query_document(request: QueryRequest):

    result = generate_answer(
        request.question,
        filename=request.filename,
    )

    return result


# ============================================================
# Health API
# ============================================================

@router.get(
    "/health",
    summary="Health Check",
    description="Check the health of DocuMind AI services."
)
def health_check():

    # --------------------------------------------------------
    # Qdrant
    # --------------------------------------------------------

    qdrant_status = check_qdrant_connection()

    # --------------------------------------------------------
    # Ollama
    # --------------------------------------------------------

    try:

        ollama_response = requests.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            timeout=5
        )

        ollama_response.raise_for_status()

        ollama_status = {
            "status": "healthy",
            "service": "ollama"
        }

    except Exception as e:

        ollama_status = {
            "status": "unhealthy",
            "service": "ollama",
            "error": str(e)
        }

    # --------------------------------------------------------
    # Overall status
    # --------------------------------------------------------

    services_healthy = (
        qdrant_status["status"] == "healthy"
        and ollama_status["status"] == "healthy"
    )

    overall_status = (
        "healthy"
        if services_healthy
        else "degraded"
    )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "application": "DocuMind AI",
        "status": overall_status,
        "services": {
            "fastapi": {
                "status": "healthy"
            },
            "qdrant": qdrant_status,
            "ollama": ollama_status
        }
    }