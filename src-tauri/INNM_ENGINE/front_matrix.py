#!/usr/bin/env python3
"""
front_matrix.py – FRONT Matrix: Input Processing & Candidate Retrieval
Part of the INNM Triangular Matrix Engine.
"""

from __future__ import annotations
import re
from typing import Any


class FrontMatrix:
    """
    FRONT matrix – first pass of the triangular engine.

    Responsibilities:
    - Tokenise and normalise the input query.
    - Search the WOODS index for matching documents.
    - Return ranked (path, score, snippet) candidates for the BACK matrix.
    """

    STOP_WORDS = frozenset(
        "a an the is are was were be been being have has had do does did "
        "will would could should may might shall can i you he she we they "
        "it its in on at to of and or but not with for from by this that "
        "these those what which who how when where why".split()
    )

    def __init__(self) -> None:
        self._index: dict[str, str] = {}
        self.state  = "idle"

    def prime(self, index: dict[str, str]) -> None:
        """Load the document index produced by WoodsBuilder."""
        self._index = index
        self.state  = "active" if index else "idle"

    def process(self, query: str) -> list[dict[str, Any]]:
        """
        Tokenise *query* and retrieve scored candidates from the WOODS index.

        Returns a list of dicts: {path, score, snippet, tokens}.
        """
        self.state = "active"
        tokens     = self._tokenise(query)

        if not tokens:
            self.state = "idle"
            return []

        candidates: list[dict[str, Any]] = []

        for path, content in self._index.items():
            content_lower = content.lower()
            score = sum(
                content_lower.count(tok)
                for tok in tokens
            )
            if score > 0:
                snippet = _extract_snippet(content, tokens, max_len=300)
                candidates.append({
                    "path":    path,
                    "score":   score,
                    "snippet": snippet,
                    "tokens":  tokens,
                })

        # Sort by descending score
        candidates.sort(key=lambda c: c["score"], reverse=True)
        self.state = "idle"
        return candidates

    # ── Private ────────────────────────────────────────────────────────────────

    def _tokenise(self, text: str) -> list[str]:
        raw    = re.sub(r"[^\w\s]", " ", text.lower())
        words  = raw.split()
        return [w for w in words if w not in self.STOP_WORDS and len(w) > 1]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_snippet(content: str, tokens: list[str], max_len: int = 300) -> str:
    """Return a context snippet from *content* around the first token match."""
    lower = content.lower()
    positions = [lower.find(tok) for tok in tokens if tok in lower]
    pos   = min(positions, default=0)
    start   = max(0, pos - 60)
    end     = min(len(content), pos + max_len)
    snippet = content[start:end].strip()
    prefix  = "…" if start > 0 else ""
    return f"{prefix}{snippet}"
