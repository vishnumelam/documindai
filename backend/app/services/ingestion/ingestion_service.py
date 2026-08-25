from app.services.ingestion.pdf_loader import load_pdf
from app.services.ingestion.chunker import chunk_text
from app.services.embeddings.embedding_service import generate_embedding
from app.services.retrieval.qdrant_service import upsert_document


def ingest_pdf(file_path, filename):
    """
    Complete PDF ingestion pipeline.

    PDF
      ↓
    Extract text
      ↓
    Split into chunks
      ↓
    Generate embeddings
      ↓
    Store in Qdrant
    """

    pages = load_pdf(file_path)

    total_chunks = 0

    for page in pages:

        page_number = page["page"]
        text = page["text"]

        chunks = chunk_text(text)

        for chunk_index, chunk in enumerate(chunks):

            embedding = generate_embedding(chunk)

            metadata = {
                "filename": filename,
                "page": page_number,
                "chunk_index": chunk_index
            }

            upsert_document(
                chunk,
                embedding,
                metadata
            )

            total_chunks += 1

    return {
        "filename": filename,
        "pages": len(pages),
        "chunks": total_chunks
    }