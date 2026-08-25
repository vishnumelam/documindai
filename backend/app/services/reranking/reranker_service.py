from sentence_transformers import CrossEncoder


MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

reranker = CrossEncoder(MODEL_NAME)


def rerank_documents(query, results, top_k=5):
    """
    Rerank Qdrant results using a CrossEncoder.

    Returns:
        [
            {
                "result": qdrant_result,
                "rerank_score": float
            }
        ]
    """

    if not results:
        return []

    pairs = []

    for result in results:

        payload = result.payload or {}

        text = payload.get("text", "").strip()

        if not text:
            text = " "

        pairs.append((query, text))

    scores = reranker.predict(pairs)

    ranked_results = []

    for result, score in zip(results, scores):

        ranked_results.append(
            {
                "result": result,
                "rerank_score": float(score)
            }
        )

    # Highest relevance first
    ranked_results.sort(
        key=lambda item: item["rerank_score"],
        reverse=True
    )

    return ranked_results[:top_k]