from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil

from app.services.ingestion.ingestion_service import ingest_pdf
from app.services.retrieval.qdrant_service import (
    list_documents,
    delete_document
)


# --------------------------------------------------
# Router
# --------------------------------------------------

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


# --------------------------------------------------
# Upload Directory
# --------------------------------------------------

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# --------------------------------------------------
# Upload Document
# --------------------------------------------------

@router.post("/upload")
def upload_document(
    file: UploadFile = File(...)
):
    """
    Upload a PDF document and run the complete
    ingestion pipeline.
    """

    # ----------------------------------------------
    # Validate file
    # ----------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # ----------------------------------------------
    # Create file path
    # ----------------------------------------------

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    # ----------------------------------------------
    # Save uploaded file
    # ----------------------------------------------

    try:

        with open(file_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

        # ------------------------------------------
        # Run ingestion pipeline
        # ------------------------------------------

        result = ingest_pdf(
            file_path,
            file.filename
        )

        return {
            "message": "Document uploaded successfully.",
            "filename": file.filename,
            "pages": result["pages"],
            "chunks": result["chunks"]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Document ingestion failed: {str(e)}"
        )


# --------------------------------------------------
# List Documents
# --------------------------------------------------

@router.get("/")
def get_documents():
    """
    Return all documents currently stored in Qdrant.
    """

    documents = list_documents()

    return {
        "documents": documents
    }


# --------------------------------------------------
# Delete Document
# --------------------------------------------------

@router.delete("/{filename}")
def remove_document(
    filename: str
):
    """
    Delete all chunks belonging to a document
    from Qdrant.
    """

    try:

        result = delete_document(
            filename
        )

        # ------------------------------------------
        # Also delete physical PDF if it exists
        # ------------------------------------------

        file_path = os.path.join(
            UPLOAD_DIR,
            filename
        )

        if os.path.exists(file_path):

            os.remove(file_path)

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )