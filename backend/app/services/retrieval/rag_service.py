"""
DocuMind AI - RAG Service

Pipeline:

Question
   ↓
Question classification
   ↓
Preference check
   ↓
Document retrieval
   ↓
Section-aware extraction / semantic retrieval
   ↓
Clean context
   ↓
Structured answer OR Ollama
   ↓
Answer + sources
"""

import os
import re
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

from app.services.embeddings.embedding_service import generate_embedding


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# CONFIGURATION
# ============================================================

LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER",
    "ollama",
).lower()

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://host.docker.internal:11434",
).rstrip("/")

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen3:4b",
)

QDRANT_URL = os.getenv(
    "QDRANT_URL",
    "http://qdrant:6333",
).rstrip("/")

QDRANT_COLLECTION = os.getenv(
    "QDRANT_COLLECTION",
    "documind_documents",
)

RETRIEVAL_LIMIT = int(
    os.getenv(
        "RETRIEVAL_LIMIT",
        "5",
    )
)

DOCUMENT_CHUNK_LIMIT = int(
    os.getenv(
        "DOCUMENT_CHUNK_LIMIT",
        "100",
    )
)

MAX_CONTEXT_CHARS = int(
    os.getenv(
        "MAX_CONTEXT_CHARS",
        "10000",
    )
)


# ============================================================
# CONSTANTS
# ============================================================

FALLBACK_ANSWER = (
    "The document does not specify this information."
)

NO_RESULTS_ANSWER = (
    "The document does not specify this information."
)


# ============================================================
# QDRANT CLIENT
# ============================================================

_qdrant_client = None


def get_qdrant_client():
    """
    Create Qdrant client lazily.
    """

    global _qdrant_client

    if _qdrant_client is not None:
        return _qdrant_client

    from qdrant_client import QdrantClient

    _qdrant_client = QdrantClient(
        url=QDRANT_URL,
        timeout=30,
        check_compatibility=False,
    )

    return _qdrant_client


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:

    if not text:
        return ""

    text = str(text)

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    text = text.replace("\u00a0", " ")

    replacements = {
        "â": "–",
        "â": "—",
        "â": "’",
        "â": "“",
        "â": "”",
        "â¢": "•",
        "â\x80\x93": "–",
        "â\x80\x94": "—",
        "â\x80\x99": "’",
        "â\x80\x9c": "“",
        "â\x80\x9d": "”",
        "â\x80\xa2": "•",
    }

    for bad, good in replacements.items():
        text = text.replace(bad, good)

    cleaned = []

    for line in text.splitlines():

        line = re.sub(
            r"[ \t]+",
            " ",
            line,
        )

        line = line.strip()

        if line:
            cleaned.append(line)

    return "\n".join(cleaned).strip()


def normalize_for_compare(text: str) -> str:

    text = normalize_text(text)

    text = text.lower()

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# ============================================================
# DUPLICATE REMOVAL
# ============================================================

def remove_duplicate_lines(text: str) -> str:

    if not text:
        return ""

    result = []
    seen = set()

    for line in text.splitlines():

        line = line.strip()

        if not line:
            continue

        key = normalize_for_compare(line)

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)

        result.append(line)

    return "\n".join(result)


# ============================================================
# CHUNK DEDUPLICATION
# ============================================================

def deduplicate_chunks(
    chunks: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:

    def safe_int(value, default=0):
        try:
            return int(value)
        except Exception:
            return default

    ordered = sorted(
        chunks,
        key=lambda item: (
            safe_int(item.get("page"), 1),
            safe_int(item.get("chunk_index"), 0),
        ),
    )

    result = []
    seen = set()

    for chunk in ordered:

        text = normalize_text(
            chunk.get("text", "")
        )

        if not text:
            continue

        key = normalize_for_compare(text)

        if key in seen:
            continue

        seen.add(key)

        result.append(
            {
                **chunk,
                "text": text,
            }
        )

    return result


# ============================================================
# MERGE CHUNKS
# ============================================================

def merge_chunks(
    chunks: List[Dict[str, Any]],
) -> str:

    chunks = deduplicate_chunks(chunks)

    if not chunks:
        return ""

    document = chunks[0]["text"]

    for chunk in chunks[1:]:

        new_text = chunk["text"]

        if not new_text:
            continue

        old_normalized = normalize_for_compare(
            document
        )

        new_normalized = normalize_for_compare(
            new_text
        )

        if new_normalized in old_normalized:
            continue

        merged = False

        # ----------------------------------------------------
        # Character overlap
        # ----------------------------------------------------

        max_chars = min(
            len(document),
            len(new_text),
            1200,
        )

        for size in range(
            max_chars,
            30,
            -1,
        ):

            left = document[-size:]
            right = new_text[:size]

            if (
                normalize_for_compare(left)
                == normalize_for_compare(right)
            ):

                document = (
                    document
                    + new_text[size:]
                )

                merged = True
                break

        if merged:
            continue

        # ----------------------------------------------------
        # Line overlap
        # ----------------------------------------------------

        old_lines = [
            x.strip()
            for x in document.splitlines()
            if x.strip()
        ]

        new_lines = [
            x.strip()
            for x in new_text.splitlines()
            if x.strip()
        ]

        max_lines = min(
            len(old_lines),
            len(new_lines),
            15,
        )

        line_merged = False

        for count in range(
            max_lines,
            0,
            -1,
        ):

            left = [
                normalize_for_compare(x)
                for x in old_lines[-count:]
            ]

            right = [
                normalize_for_compare(x)
                for x in new_lines[:count]
            ]

            if left == right:

                remaining = new_lines[count:]

                if remaining:

                    document = (
                        document.rstrip()
                        + "\n"
                        + "\n".join(remaining)
                    )

                line_merged = True
                break

        if line_merged:
            continue

        # ----------------------------------------------------
        # No overlap
        # ----------------------------------------------------

        document = (
            document.rstrip()
            + "\n"
            + new_text.lstrip()
        )

    document = normalize_text(
        document
    )

    return remove_duplicate_lines(
        document
    )


# ============================================================
# QDRANT FILTER
# ============================================================

def build_filename_filter(
    filename: Optional[str],
):

    if not filename:
        return None

    from qdrant_client.models import (
        Filter,
        FieldCondition,
        MatchValue,
    )

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
# QDRANT POINT → CHUNK
# ============================================================

def point_to_chunk(
    point: Any,
) -> Optional[Dict[str, Any]]:

    payload = getattr(
        point,
        "payload",
        None,
    ) or {}

    text = (
        payload.get("text")
        or payload.get("content")
        or payload.get("chunk")
        or ""
    )

    if not text:
        return None

    score = getattr(
        point,
        "score",
        None,
    )

    result = {
        "id": str(
            getattr(
                point,
                "id",
                "",
            )
        ),
        "text": normalize_text(text),
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
    }

    if score is not None:
        result["score"] = float(score)

    return result


# ============================================================
# LOAD COMPLETE DOCUMENT
# ============================================================

def load_complete_document(
    filename: str,
) -> List[Dict[str, Any]]:

    client = get_qdrant_client()

    query_filter = build_filename_filter(
        filename
    )

    all_points = []
    offset = None

    while True:

        batch, next_offset = client.scroll(
            collection_name=QDRANT_COLLECTION,
            scroll_filter=query_filter,
            limit=DOCUMENT_CHUNK_LIMIT,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        if not batch:
            break

        all_points.extend(batch)

        if next_offset is None:
            break

        offset = next_offset

    chunks = []

    for point in all_points:

        chunk = point_to_chunk(point)

        if chunk:
            chunks.append(chunk)

    return deduplicate_chunks(chunks)


# ============================================================
# SEMANTIC SEARCH
# ============================================================

def search_documents(
    question: str,
    filename: Optional[str] = None,
    limit: int = RETRIEVAL_LIMIT,
) -> List[Dict[str, Any]]:

    client = get_qdrant_client()

    query_vector = generate_embedding(
        question
    )

    if not query_vector:
        return []

    query_filter = build_filename_filter(
        filename
    )

    response = client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )

    results = []

    for point in response.points:

        chunk = point_to_chunk(point)

        if chunk:
            results.append(chunk)

    return results


# ============================================================
# QUESTION CLASSIFICATION
# ============================================================

def classify_question(
    question: str,
) -> str:

    q = normalize_for_compare(question)

    # Certifications
    if any(
        phrase in q
        for phrase in [
            "certification",
            "certifications",
            "certificate",
            "certificates",
            "certified",
        ]
    ):
        return "certifications"

    # Technical skills
    if any(
        phrase in q
        for phrase in [
            "technical skills",
            "technical skill",
            "technologies",
            "technology stack",
            "tech stack",
            "programming languages",
            "technical expertise",
            "skills",
            "what can",
            "what technologies",
        ]
    ):
        return "technical_skills"

    # Projects
    if any(
        phrase in q
        for phrase in [
            "projects",
            "project",
            "worked on",
            "work on",
            "built",
            "developed",
            "applications",
        ]
    ):
        return "projects"

    return "general"


# ============================================================
# PREFERENCE QUESTIONS
# ============================================================

def is_preference_question(
    question: str,
) -> bool:

    q = normalize_for_compare(
        question
    )

    preference_words = [
        "favorite",
        "favourite",
        "preferred",
        "preference",
        "likes",
        "love",
        "loves",
        "favorite language",
        "favourite language",
        "preferred language",
        "favorite programming language",
        "favourite programming language",
    ]

    return any(
        word in q
        for word in preference_words
    )


# ============================================================
# RESUME HEADINGS
# ============================================================

MAJOR_HEADINGS = {
    "summary",
    "profile",
    "objective",

    "experience",
    "work experience",
    "professional experience",

    "education",

    "projects",
    "project",
    "academic projects",
    "personal projects",

    "technical skills",
    "technical skill",
    "skills",
    "technical expertise",

    "certifications",
    "certification",
    "certificates",

    "achievements",
    "interests",
    "contact",
    "publications",
    "references",
}


# ============================================================
# HEADING DETECTION
# ============================================================

def normalize_heading(
    line: str,
) -> str:

    normalized = normalize_for_compare(
        line
    )

    normalized = re.sub(
        r"[:\-]+$",
        "",
        normalized,
    ).strip()

    return normalized


def is_heading(
    line: str,
) -> bool:

    return (
        normalize_heading(line)
        in MAJOR_HEADINGS
    )


# ============================================================
# FIND SECTION
# ============================================================

def extract_section(
    document: str,
    headings: List[str],
) -> Optional[str]:

    if not document:
        return None

    lines = document.splitlines()

    wanted = {
        normalize_heading(heading)
        for heading in headings
    }

    start = None

    # --------------------------------------------------------
    # Find requested heading
    # --------------------------------------------------------

    for index, line in enumerate(lines):

        normalized = normalize_heading(
            line
        )

        if normalized in wanted:

            start = index + 1
            break

    if start is None:
        return None

    output = []

    # --------------------------------------------------------
    # Read until next major heading
    # --------------------------------------------------------

    for line in lines[start:]:

        normalized = normalize_heading(
            line
        )

        if (
            normalized
            and normalized in MAJOR_HEADINGS
            and normalized not in wanted
        ):
            break

        output.append(line)

    result = normalize_text(
        "\n".join(output)
    )

    if not result:
        return None

    return result


# ============================================================
# FALLBACK SECTION DETECTION
# ============================================================

def extract_section_fallback(
    document: str,
    section_type: str,
) -> Optional[str]:

    if not document:
        return None

    text = normalize_text(document)

    lines = text.splitlines()

    if section_type == "technical_skills":

        patterns = [
            r"^\s*technical\s+skills\s*:?\s*$",
            r"^\s*technical\s+skill\s*:?\s*$",
            r"^\s*skills\s*:?\s*$",
            r"^\s*technical\s+expertise\s*:?\s*$",
        ]

    elif section_type == "certifications":

        patterns = [
            r"^\s*certifications?\s*:?\s*$",
            r"^\s*certificates?\s*:?\s*$",
        ]

    elif section_type == "projects":

        patterns = [
            r"^\s*projects?\s*:?\s*$",
            r"^\s*academic\s+projects?\s*:?\s*$",
            r"^\s*personal\s+projects?\s*:?\s*$",
        ]

    else:
        return None

    start = None

    for index, line in enumerate(lines):

        for pattern in patterns:

            if re.match(
                pattern,
                line,
                flags=re.IGNORECASE,
            ):
                start = index + 1
                break

        if start is not None:
            break

    if start is None:
        return None

    output = []

    for line in lines[start:]:

        normalized = normalize_heading(
            line
        )

        if (
            normalized
            and normalized in MAJOR_HEADINGS
        ):
            break

        output.append(line)

    result = clean_section(
        "\n".join(output)
    )

    return result or None


# ============================================================
# CLEAN SECTION
# ============================================================

def clean_section(
    section: str,
) -> str:

    if not section:
        return ""

    lines = []

    for line in section.splitlines():

        line = line.strip()

        if not line:
            continue

        # Remove bullet characters
        line = re.sub(
            r"^[•●▪◦\-*]+\s*",
            "",
            line,
        )

        # Remove RAG metadata
        if re.match(
            r"(?i)^source\s+\d+",
            line,
        ):
            continue

        if re.match(
            r"(?i)^filename\s*:",
            line,
        ):
            continue

        if re.match(
            r"(?i)^page\s*:",
            line,
        ):
            continue

        if re.match(
            r"(?i)^chunk\s*:",
            line,
        ):
            continue

        if re.match(
            r"(?i)^content\s*:",
            line,
        ):
            continue

        lines.append(line)

    # Remove duplicate lines
    result = []
    seen = set()

    for line in lines:

        key = normalize_for_compare(
            line
        )

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)

        result.append(line)

    return "\n".join(
        result
    ).strip()


# ============================================================
# TECHNICAL SKILLS
# ============================================================

def extract_technical_skills(
    document: str,
) -> Optional[str]:

    section = extract_section(
        document,
        [
            "TECHNICAL SKILLS",
            "TECHNICAL SKILL",
            "SKILLS",
            "TECHNICAL EXPERTISE",
        ],
    )

    if not section:

        section = extract_section_fallback(
            document,
            "technical_skills",
        )

    if not section:
        return None

    section = clean_section(
        section
    )

    return section or None


# ============================================================
# CERTIFICATIONS
# ============================================================

def extract_certifications(
    document: str,
) -> Optional[str]:

    section = extract_section(
        document,
        [
            "CERTIFICATIONS",
            "CERTIFICATION",
            "CERTIFICATES",
        ],
    )

    if not section:

        section = extract_section_fallback(
            document,
            "certifications",
        )

    if not section:
        return None

    section = clean_section(
        section
    )

    if not section:
        return None

    lines = []

    for line in section.splitlines():

        line = line.strip()

        if not line:
            continue

        # Remove existing numbering
        line = re.sub(
            r"^\s*\d+[\.\)]\s*",
            "",
            line,
        )

        lines.append(line)

    if not lines:
        return None

    return "\n".join(
        f"{index}. {line}"
        for index, line in enumerate(
            lines,
            start=1,
        )
    )


# ============================================================
# PROJECTS
# ============================================================

def extract_projects(
    document: str,
) -> Optional[str]:

    section = extract_section(
        document,
        [
            "PROJECTS",
            "ACADEMIC PROJECTS",
            "PERSONAL PROJECTS",
        ],
    )

    if not section:

        section = extract_section_fallback(
            document,
            "projects",
        )

    if not section:
        return None

    section = clean_section(
        section
    )

    if not section:
        return None

    # --------------------------------------------------------
    # Remove exact duplicate lines
    # --------------------------------------------------------

    lines = []
    seen = set()

    for line in section.splitlines():

        normalized = normalize_for_compare(
            line
        )

        if not normalized:
            continue

        if normalized in seen:
            continue

        seen.add(normalized)

        lines.append(line)

    # --------------------------------------------------------
    # Format project output
    # --------------------------------------------------------

    output = []

    for line in lines:

        # Preserve Tech Stack lines
        if line.lower().startswith(
            "tech stack:"
        ):
            output.append(
                line
            )
            continue

        # Preserve GitHub lines
        if line.lower().startswith(
            "github:"
        ):
            output.append(
                line
            )
            continue

        output.append(
            line
        )

    return "\n".join(
        output
    ).strip() or None


# ============================================================
# STRUCTURED ANSWER
# ============================================================

def generate_structured_answer(
    document: str,
    question_type: str,
) -> Optional[str]:

    if question_type == "certifications":

        return extract_certifications(
            document
        )

    if question_type == "technical_skills":

        return extract_technical_skills(
            document
        )

    if question_type == "projects":

        return extract_projects(
            document
        )

    return None


# ============================================================
# SECTION → SOURCE MATCHING
# ============================================================

def get_section_source_chunks(
    chunks: List[Dict[str, Any]],
    question_type: str,
) -> List[Dict[str, Any]]:

    if not chunks:
        return []

    # --------------------------------------------------------
    # Since your current resume is one page and has 7 chunks,
    # determine which chunks contain the requested section.
    # --------------------------------------------------------

    section_markers = {

        "technical_skills": [
            "technical skills",
            "languages:",
            "generative ai:",
            "ml/ai frameworks:",
            "backend:",
            "frontend:",
            "databases:",
            "tools & platforms:",
            "core concepts:",
        ],

        "certifications": [
            "certifications",
            "oracle certified",
            "retrieval-augmented generation",
            "codesignal",
        ],

        "projects": [
            "projects",
            "generative ai chat assistant",
            "ai-powered tomato disease",
            "tech stack:",
            "github:",
        ],
    }

    markers = section_markers.get(
        question_type,
        [],
    )

    relevant = []

    for chunk in chunks:

        text = normalize_for_compare(
            chunk.get(
                "text",
                "",
            )
        )

        if not text:
            continue

        if any(
            marker in text
            for marker in markers
        ):
            relevant.append(
                chunk
            )

    # --------------------------------------------------------
    # If section matching fails, return the complete document
    # chunks rather than returning empty sources.
    # --------------------------------------------------------

    if not relevant:
        return chunks

    # --------------------------------------------------------
    # Deduplicate
    # --------------------------------------------------------

    return deduplicate_chunks(
        relevant
    )


# ============================================================
# OLLAMA PROMPT
# ============================================================

def build_prompt(
    question: str,
    context: str,
) -> str:

    return f"""
You are DocuMind AI, a document question-answering assistant.

Answer the user's question using ONLY information explicitly contained
in the DOCUMENT CONTEXT.

STRICT RULES:

1. Use only the document context.
2. Never use outside knowledge.
3. Never guess.
4. Never infer personal preferences.
5. Never invent information.
6. Never mention source numbers.
7. Never mention chunks.
8. Never mention retrieval.
9. Never explain your reasoning.
10. Never show your thinking.
11. Do not repeat the question.
12. Return only the final answer.
13. Keep the answer concise.
14. Preserve names, dates, organizations, technologies,
    certifications and project names.
15. If the requested information is not explicitly present,
    respond exactly:

The document does not specify this information.

DOCUMENT CONTEXT:

{context}

USER QUESTION:

{question}

FINAL ANSWER:
""".strip()


# ============================================================
# OLLAMA
# ============================================================

def call_ollama(
    prompt: str,
) -> str:

    url = (
        f"{OLLAMA_BASE_URL}"
        "/api/generate"
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0,
            "num_predict": 300,
        },
    }

    response = requests.post(
        url,
        json=payload,
        timeout=180,
    )

    response.raise_for_status()

    data = response.json()

    answer = data.get(
        "response",
        "",
    )

    return clean_llm_answer(
        answer
    )


# ============================================================
# CLEAN LLM ANSWER
# ============================================================

def clean_llm_answer(
    answer: str,
) -> str:

    if not answer:
        return ""

    answer = answer.strip()

    # Remove Qwen thinking
    answer = re.sub(
        r"<think>.*?</think>",
        "",
        answer,
        flags=re.DOTALL | re.IGNORECASE,
    )

    # Remove SOURCE labels
    answer = re.sub(
        r"(?im)^\s*SOURCE\s+\d+.*$",
        "",
        answer,
    )

    # Remove CHUNK labels
    answer = re.sub(
        r"(?im)^\s*CHUNK\s+\d+.*$",
        "",
        answer,
    )

    # Remove answer labels
    answer = re.sub(
        r"(?im)^\s*(answer|final answer)\s*:\s*",
        "",
        answer,
    )

    # Remove obvious reasoning leakage
    markers = [
        "\nWe must",
        "\nWe need to",
        "\nTherefore",
        "\nLet's write",
        "\nLet us write",
        "\nThe question asks",
        "\nWe are given",
        "\nI should",
        "\nI need to",
        "\nThe document context",
        "\nThis clearly",
        "\nThe context explicitly",
    ]

    for marker in markers:

        position = answer.find(
            marker
        )

        if position > 0:

            answer = answer[
                :position
            ]

    answer = re.sub(
        r"\n{3,}",
        "\n\n",
        answer,
    )

    return answer.strip()


# ============================================================
# RETRIEVE DOCUMENT
# ============================================================

def retrieve_document(
    question: str,
    filename: Optional[str] = None,
) -> Dict[str, Any]:

    question_type = classify_question(
        question
    )

    # ========================================================
    # STRUCTURED QUESTIONS
    # ========================================================

    if question_type in {
        "certifications",
        "technical_skills",
        "projects",
    }:

        if filename:

            chunks = load_complete_document(
                filename
            )

            document = merge_chunks(
                chunks
            )

            return {
                "chunks": chunks,
                "document": document,
                "question_type": question_type,
            }

        # No selected document:
        # use semantic retrieval

        chunks = search_documents(
            question=question,
            filename=None,
            limit=RETRIEVAL_LIMIT,
        )

        document = merge_chunks(
            chunks
        )

        return {
            "chunks": chunks,
            "document": document,
            "question_type": question_type,
        }

    # ========================================================
    # GENERAL QUESTIONS
    # ========================================================

    chunks = search_documents(
        question=question,
        filename=filename,
        limit=RETRIEVAL_LIMIT,
    )

    return {
        "chunks": chunks,
        "document": "",
        "question_type": question_type,
    }


# ============================================================
# BUILD SEMANTIC CONTEXT
# ============================================================

def build_semantic_context(
    chunks: List[Dict[str, Any]],
) -> str:

    if not chunks:
        return ""

    parts = []
    total_chars = 0

    for index, chunk in enumerate(
        chunks,
        start=1,
    ):

        text = normalize_text(
            chunk.get("text", "")
        )

        if not text:
            continue

        block = (
            f"[Document Chunk {index}]\n"
            f"{text}"
        )

        if (
            total_chars
            + len(block)
            > MAX_CONTEXT_CHARS
        ):
            break

        parts.append(block)

        total_chars += len(block)

    return "\n\n".join(parts)


# ============================================================
# BUILD SOURCES
# ============================================================

def build_sources(
    chunks: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:

    sources = []
    seen = set()

    for chunk in chunks:

        filename = chunk.get(
            "filename",
            "Unknown",
        )

        page = chunk.get(
            "page",
            1,
        )

        chunk_index = chunk.get(
            "chunk_index",
            0,
        )

        key = (
            filename,
            page,
            chunk_index,
        )

        if key in seen:
            continue

        seen.add(key)

        source = {
            "filename": filename,
            "page": page,
            "chunk_index": chunk_index,
        }

        if "score" in chunk:

            source[
                "retrieval_score"
            ] = round(
                float(
                    chunk["score"]
                ),
                4,
            )

        sources.append(source)

    return sources


# ============================================================
# MAIN RAG PIPELINE
# ============================================================

def generate_answer(
    question: str,
    filename: Optional[str] = None,
) -> Dict[str, Any]:

    question = (
        question or ""
    ).strip()

    # ========================================================
    # EMPTY QUESTION
    # ========================================================

    if not question:

        return {
            "answer": "Please enter a question.",
            "sources": [],
        }

    # ========================================================
    # NEVER INFER PERSONAL PREFERENCES
    # ========================================================

    if is_preference_question(
        question
    ):

        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
        }

    # ========================================================
    # RETRIEVAL
    # ========================================================

    try:

        retrieval = retrieve_document(
            question=question,
            filename=filename,
        )

    except Exception as exc:

        return {
            "answer": (
                "Unable to search the "
                "document knowledge base."
            ),
            "sources": [],
            "error": str(exc),
        }

    chunks = retrieval.get(
        "chunks",
        [],
    )

    document = retrieval.get(
        "document",
        "",
    )

    question_type = retrieval.get(
        "question_type",
        "general",
    )

    # ========================================================
    # NO RESULTS
    # ========================================================

    if not chunks:

        return {
            "answer": NO_RESULTS_ANSWER,
            "sources": [],
        }

    # ========================================================
    # STRUCTURED QUESTIONS
    # ========================================================

    if question_type in {
        "certifications",
        "technical_skills",
        "projects",
    }:

        if not document:

            return {
                "answer": NO_RESULTS_ANSWER,
                "sources": [],
            }

        structured_answer = (
            generate_structured_answer(
                document=document,
                question_type=question_type,
            )
        )

        # ----------------------------------------------------
        # IMPORTANT:
        # Return only sources belonging to the relevant
        # section instead of all 7 resume chunks.
        # ----------------------------------------------------

        relevant_chunks = (
            get_section_source_chunks(
                chunks,
                question_type,
            )
        )

        sources = build_sources(
            relevant_chunks
        )

        if structured_answer:

            return {
                "answer": structured_answer,
                "sources": sources,
            }

        # ----------------------------------------------------
        # Fallback to Ollama only if structured extraction
        # failed.
        # ----------------------------------------------------

        if LLM_PROVIDER != "ollama":

            return {
                "answer": NO_RESULTS_ANSWER,
                "sources": sources,
            }

        fallback_context = document[
            :MAX_CONTEXT_CHARS
        ]

        prompt = build_prompt(
            question=question,
            context=fallback_context,
        )

        try:

            answer = call_ollama(
                prompt
            )

            if not answer:
                answer = NO_RESULTS_ANSWER

            return {
                "answer": answer,
                "sources": sources,
            }

        except Exception:

            return {
                "answer": NO_RESULTS_ANSWER,
                "sources": sources,
            }

    # ========================================================
    # GENERAL RAG
    # ========================================================

    sources = build_sources(
        chunks
    )

    if LLM_PROVIDER != "ollama":

        return {
            "answer": (
                "Unsupported LLM provider: "
                f"{LLM_PROVIDER}"
            ),
            "sources": sources,
        }

    context = build_semantic_context(
        chunks
    )

    if not context:

        return {
            "answer": NO_RESULTS_ANSWER,
            "sources": sources,
        }

    prompt = build_prompt(
        question=question,
        context=context,
    )

    # ========================================================
    # OLLAMA
    # ========================================================

    try:

        answer = call_ollama(
            prompt
        )

    except requests.Timeout:

        return {
            "answer": (
                "The AI model took too long "
                "to respond."
            ),
            "sources": sources,
        }

    except requests.RequestException as exc:

        return {
            "answer": (
                "Unable to generate an answer "
                "from the AI model."
            ),
            "sources": sources,
            "error": str(exc),
        }

    except Exception as exc:

        return {
            "answer": (
                "Unable to generate an answer "
                "from the document."
            ),
            "sources": sources,
            "error": str(exc),
        }

    # ========================================================
    # EMPTY MODEL RESPONSE
    # ========================================================

    if not answer:

        answer = FALLBACK_ANSWER

    return {
        "answer": answer,
        "sources": sources,
    }


# ============================================================
# QDRANT HEALTH
# ============================================================

def check_qdrant_connection() -> Dict[str, Any]:

    try:

        client = get_qdrant_client()

        client.get_collections()

        return {
            "status": "healthy",
            "service": "qdrant",
        }

    except Exception as exc:

        return {
            "status": "unhealthy",
            "service": "qdrant",
            "error": str(exc),
        }


# ============================================================
# OLLAMA HEALTH
# ============================================================

def check_ollama_connection() -> Dict[str, Any]:

    try:

        response = requests.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            timeout=10,
        )

        response.raise_for_status()

        return {
            "status": "healthy",
            "service": "ollama",
        }

    except Exception as exc:

        return {
            "status": "unhealthy",
            "service": "ollama",
            "error": str(exc),
        }


# ============================================================
# COMPLETE SERVICE HEALTH
# ============================================================

def check_services() -> Dict[str, Any]:

    qdrant = (
        check_qdrant_connection()
    )

    ollama = (
        check_ollama_connection()
    )

    overall = (
        "healthy"
        if (
            qdrant["status"] == "healthy"
            and
            ollama["status"] == "healthy"
        )
        else "degraded"
    )

    return {
        "application": "DocuMind AI",
        "status": overall,
        "services": {
            "fastapi": {
                "status": "healthy",
            },
            "qdrant": qdrant,
            "ollama": ollama,
        },
    }