import os
import requests

from dotenv import load_dotenv


# ============================================================
# Load environment variables
# ============================================================

load_dotenv()


# ============================================================
# Configuration
# ============================================================

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434",
).rstrip("/")

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "nomic-embed-text",
)

OLLAMA_EMBEDDING_URL = (
    f"{OLLAMA_BASE_URL}/api/embeddings"
)


# ============================================================
# Generate Embedding
# ============================================================

def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector using Ollama.

    The embedding model and Ollama URL are loaded
    from environment variables.

    Current model:
        nomic-embed-text

    Current vector size:
        768
    """

    if not text or not text.strip():
        raise ValueError(
            "Cannot generate embedding for empty text."
        )

    try:

        response = requests.post(
            OLLAMA_EMBEDDING_URL,

            json={
                "model": EMBEDDING_MODEL,
                "prompt": text,
            },

            timeout=120,
        )

        response.raise_for_status()

    except requests.exceptions.ConnectionError as e:

        raise RuntimeError(
            "Unable to connect to Ollama. "
            "Please make sure Ollama is running."
        ) from e

    except requests.exceptions.Timeout as e:

        raise RuntimeError(
            "Ollama embedding request timed out."
        ) from e

    except requests.exceptions.RequestException as e:

        raise RuntimeError(
            "Ollama embedding request failed: "
            f"{str(e)}"
        ) from e

    try:

        data = response.json()

    except ValueError as e:

        raise RuntimeError(
            "Ollama returned an invalid JSON response."
        ) from e

    embedding = data.get("embedding")

    if not embedding:

        raise RuntimeError(
            "Ollama response did not contain an embedding."
        )

    return embedding