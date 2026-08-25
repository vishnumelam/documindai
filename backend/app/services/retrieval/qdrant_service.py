import os
import hashlib

from dotenv import load_dotenv

from qdrant_client import QdrantClient

from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)


# ============================================================
# Load Environment Variables
# ============================================================

load_dotenv()


# ============================================================
# Configuration
# ============================================================

QDRANT_URL = os.getenv(
    "QDRANT_URL",
    "http://localhost:6333",
)

COLLECTION_NAME = os.getenv(
    "QDRANT_COLLECTION",
    "documind_documents",
)

# nomic-embed-text = 768 dimensions
VECTOR_SIZE = 768


# ============================================================
# Qdrant Client
# ============================================================

client = QdrantClient(
    url=QDRANT_URL,
    check_compatibility=False,
)


# ============================================================
# Create Collection
# ============================================================

def create_collection():
    """
    Create the DocuMind Qdrant collection if it
    does not already exist.
    """

    collections = client.get_collections()

    existing_collections = [
        collection.name
        for collection in collections.collections
    ]

    if COLLECTION_NAME not in existing_collections:

        client.create_collection(
            collection_name=COLLECTION_NAME,

            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )

        return (
            f"Collection '{COLLECTION_NAME}' "
            f"created successfully."
        )

    return (
        f"Collection '{COLLECTION_NAME}' "
        f"already exists."
    )


# ============================================================
# Upsert Document Chunk
# ============================================================

def upsert_document(
    text,
    embedding,
    metadata=None,
):
    """
    Store one document chunk in Qdrant.

    A deterministic ID is generated using:

        filename
        page
        chunk_index
        text

    This prevents duplicate chunks when the
    same document is uploaded again.
    """

    metadata = metadata or {}

    filename = metadata.get(
        "filename",
        "unknown",
    )

    page = metadata.get(
        "page",
        "unknown",
    )

    chunk_index = metadata.get(
        "chunk_index",
        "unknown",
    )

    # --------------------------------------------------------
    # Deterministic ID
    # --------------------------------------------------------

    unique_string = (
        f"{filename}|"
        f"{page}|"
        f"{chunk_index}|"
        f"{text}"
    )

    point_id = hashlib.md5(
        unique_string.encode("utf-8")
    ).hexdigest()

    # --------------------------------------------------------
    # Store point
    # --------------------------------------------------------

    client.upsert(
        collection_name=COLLECTION_NAME,

        points=[
            PointStruct(
                id=point_id,

                vector=embedding,

                payload={
                    "text": text,
                    **metadata,
                },
            )
        ],
    )

    return point_id


# ============================================================
# Filename Filter
# ============================================================

def _build_filename_filter(
    filename: str | None = None,
):
    """
    Build an exact filename filter.

    Example:

        filename="GenAI_Resume.pdf"

    means ONLY that document is searched.
    """

    if not filename:
        return None

    return Filter(
        must=[
            FieldCondition(
                key="filename",

                match=MatchValue(
                    value=filename,
                ),
            )
        ]
    )


# ============================================================
# Search Documents
# ============================================================

def search_documents(
    query_embedding,
    limit=5,
    filename=None,
):
    """
    Semantic search over the Qdrant knowledge base.

    IMPORTANT:

    - Uses query_points(), compatible with the
      installed qdrant-client.
    - Supports exact filename filtering.
    - Returns the Qdrant semantic similarity score.
    - Results are sorted by relevance.
    - Performs a second filename safety check.
    """

    # ========================================================
    # Validate embedding
    # ========================================================

    if not query_embedding:
        return []

    # ========================================================
    # Validate limit
    # ========================================================

    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 5

    limit = max(1, min(limit, 20))

    # ========================================================
    # Build filename filter
    # ========================================================

    document_filter = _build_filename_filter(
        filename
    )

    # ========================================================
    # Query Qdrant
    # ========================================================

    response = client.query_points(
        collection_name=COLLECTION_NAME,

        query=query_embedding,

        query_filter=document_filter,

        limit=limit,

        with_payload=True,

        with_vectors=False,
    )

    points = response.points

    # ========================================================
    # Normalize results
    # ========================================================

    results = []

    for point in points:

        payload = point.payload or {}

        result_filename = payload.get(
            "filename"
        )

        # ----------------------------------------------------
        # Filename safety check
        # ----------------------------------------------------

        if filename:

            if result_filename != filename:
                continue

        # ----------------------------------------------------
        # Get Qdrant score safely
        # ----------------------------------------------------

        raw_score = getattr(
            point,
            "score",
            0.0,
        )

        try:
            retrieval_score = float(
                raw_score or 0.0
            )
        except (
            TypeError,
            ValueError,
        ):
            retrieval_score = 0.0

        # ----------------------------------------------------
        # Build result
        # ----------------------------------------------------

        results.append(
            {
                "id": point.id,

                "filename": result_filename,

                "page": payload.get(
                    "page",
                    1,
                ),

                "chunk_index": payload.get(
                    "chunk_index",
                    0,
                ),

                "text": payload.get(
                    "text",
                    "",
                ),

                "retrieval_score": retrieval_score,
            }
        )

    # ========================================================
    # Sort by semantic relevance
    # ========================================================

    results.sort(
        key=lambda item: item.get(
            "retrieval_score",
            0.0,
        ),
        reverse=True,
    )

    return results


# ============================================================
# List Documents
# ============================================================

def list_documents():
    """
    Return unique documents stored in Qdrant.

    Example:

        [
            {
                "filename": "GenAI_Resume.pdf",
                "pages": 1,
                "chunks": 7
            }
        ]
    """

    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,

        limit=1000,

        with_payload=True,

        with_vectors=False,
    )

    documents = {}

    # ========================================================
    # Build document information
    # ========================================================

    for point in points:

        payload = point.payload or {}

        filename = payload.get(
            "filename"
        )

        if not filename:
            continue

        # ----------------------------------------------------
        # Create document entry
        # ----------------------------------------------------

        if filename not in documents:

            documents[filename] = {
                "filename": filename,
                "pages": set(),
                "chunks": 0,
            }

        # ----------------------------------------------------
        # Track page
        # ----------------------------------------------------

        page = payload.get(
            "page"
        )

        if page is not None:

            documents[
                filename
            ]["pages"].add(page)

        # ----------------------------------------------------
        # Track chunk
        # ----------------------------------------------------

        documents[
            filename
        ]["chunks"] += 1

    # ========================================================
    # Convert to API response
    # ========================================================

    result = []

    for document in documents.values():

        result.append(
            {
                "filename": document[
                    "filename"
                ],

                "pages": len(
                    document["pages"]
                ),

                "chunks": document[
                    "chunks"
                ],
            }
        )

    # ========================================================
    # Sort alphabetically
    # ========================================================

    result.sort(
        key=lambda item: item[
            "filename"
        ]
    )

    return result


# ============================================================
# Delete Document
# ============================================================

def delete_document(filename):
    """
    Delete all chunks belonging to a
    specific document.
    """

    client.delete(
        collection_name=COLLECTION_NAME,

        points_selector=Filter(
            must=[
                FieldCondition(
                    key="filename",

                    match=MatchValue(
                        value=filename,
                    ),
                )
            ]
        ),
    )

    return {
        "message": (
            f"Document '{filename}' "
            f"deleted successfully."
        )
    }


# ============================================================
# Get Document Chunks
# ============================================================

def get_document_chunks(
    filename,
):
    """
    Retrieve every chunk belonging to
    one specific document.

    Used for debugging and verification.
    """

    document_filter = Filter(
        must=[
            FieldCondition(
                key="filename",

                match=MatchValue(
                    value=filename,
                ),
            )
        ]
    )

    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,

        scroll_filter=document_filter,

        limit=1000,

        with_payload=True,

        with_vectors=False,
    )

    results = []

    for point in points:

        payload = point.payload or {}

        # ----------------------------------------------------
        # Extra filename safety check
        # ----------------------------------------------------

        if payload.get(
            "filename"
        ) != filename:
            continue

        results.append(
            {
                "id": point.id,

                "filename": payload.get(
                    "filename"
                ),

                "page": payload.get(
                    "page",
                    1,
                ),

                "chunk_index": payload.get(
                    "chunk_index",
                    0,
                ),

                "text": payload.get(
                    "text",
                    "",
                ),
            }
        )

    # ========================================================
    # Preserve document order for debugging
    # ========================================================

    results.sort(
        key=lambda item: (
            item.get("page", 1),
            item.get("chunk_index", 0),
        )
    )

    return results


# ============================================================
# Qdrant Health Check
# ============================================================

def check_qdrant_connection():
    """
    Check whether Qdrant is reachable.
    """

    try:

        client.get_collections()

        return {
            "status": "healthy",
            "service": "qdrant",
        }

    except Exception as e:

        return {
            "status": "unhealthy",
            "service": "qdrant",
            "error": str(e),
        }