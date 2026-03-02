#!/usr/bin/env python3
"""
back_matrix.py – BACK Matrix: Context Validation & Re-ranking
Part of the INNM Triangular Matrix Engine.
"""

from __future__ import annotations
import math
from typing import Any


class BackMatrix:
    """
    BACK matrix – second pass of the triangular engine.

    Responsibilities:
    - Accept FRONT candidates and the original query.
    - Apply TF-IDF-inspired re-ranking for better relevance.
    - Filter out candidates below a minimum relevance threshold.
    - Return a validated, re-ranked list for the UP matrix.
    """

    MIN_SCORE   = 1
    TOP_K       = 5

    def __init__(self) -> None:
        self._doc_count = 0
        self._df: dict[str, int] = {}   # document frequency per token
        self.state = "idle"

    def prime(self, index: dict[str, str]) -> None:
        """Pre-compute document frequencies from the WOODS index."""
        self._doc_count = len(index)
        self._df = {}
        for content in index.values():
            content_lower = content.lower()
            # Use the set of unique words to count document frequency
            unique_words = set(content_lower.split())
            for word in unique_words:
                self._df[word] = self._df.get(word, 0) + 1
        self.state = "active" if index else "idle"

    def validate(
        self,
        query: str,
        candidates: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Re-rank *candidates* using a TF-IDF-inspired score and filter by
        MIN_SCORE.  Returns at most TOP_K results.
        """
        if not candidates:
            return []

        self.state = "active"
        query_tokens = set(query.lower().split())
        scored: list[dict[str, Any]] = []

        for cand in candidates:
            snippet_lower = cand["snippet"].lower()
            tfidf = 0.0
            for tok in query_tokens:
                tf  = snippet_lower.count(tok)
                df  = self._df.get(tok, 0)
                idf = math.log((self._doc_count + 1) / (df + 1)) + 1.0
                tfidf += tf * idf

            combined = cand["score"] + tfidf
            if combined >= self.MIN_SCORE:
                scored.append({**cand, "combined_score": combined})

        scored.sort(key=lambda c: c["combined_score"], reverse=True)
        self.state = "idle"
        return scored[: self.TOP_K]
