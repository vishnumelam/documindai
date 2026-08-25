import re


def chunk_text(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100
):
    """
    Split document text into semantically cleaner,
    overlapping chunks.

    The splitter tries to preserve paragraph and sentence
    boundaries instead of cutting text arbitrarily.
    """

    if not text or not text.strip():
        return []

    text = text.replace("\r\n", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)

    # --------------------------------------------------
    # Split primarily by paragraphs
    # --------------------------------------------------

    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n\s*\n", text)
        if paragraph.strip()
    ]

    chunks = []
    current = ""

    for paragraph in paragraphs:

        # --------------------------------------------------
        # If paragraph fits, add it to current chunk
        # --------------------------------------------------

        if len(current) + len(paragraph) + 1 <= chunk_size:

            if current:
                current += "\n\n" + paragraph
            else:
                current = paragraph

            continue

        # --------------------------------------------------
        # Store current chunk
        # --------------------------------------------------

        if current:
            chunks.append(current.strip())

        # --------------------------------------------------
        # Handle very large paragraphs
        # --------------------------------------------------

        if len(paragraph) > chunk_size:

            start = 0

            while start < len(paragraph):

                end = start + chunk_size

                piece = paragraph[start:end].strip()

                if piece:
                    chunks.append(piece)

                start += chunk_size - chunk_overlap

            current = ""

        else:

            current = paragraph

    # --------------------------------------------------
    # Add final chunk
    # --------------------------------------------------

    if current:
        chunks.append(current.strip())

    # --------------------------------------------------
    # Remove duplicates / empty chunks
    # --------------------------------------------------

    cleaned_chunks = []

    for chunk in chunks:

        chunk = chunk.strip()

        if not chunk:
            continue

        if cleaned_chunks and chunk == cleaned_chunks[-1]:
            continue

        cleaned_chunks.append(chunk)

    return cleaned_chunks