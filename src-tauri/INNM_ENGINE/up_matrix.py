#!/usr/bin/env python3
"""
up_matrix.py – UP Matrix: Response Synthesis
Part of the INNM Triangular Matrix Engine.
"""

from __future__ import annotations
import os
from typing import Any


class UpMatrix:
    """
    UP matrix – third and final pass of the triangular engine.

    Responsibilities:
    - Receive validated candidates from the BACK matrix.
    - Synthesise a human-readable response from matching snippets.
    - Provide a coherent, attributed answer.
    """

    def __init__(self) -> None:
        self._total_docs = 0
        self._woods_path = ""
        self.state       = "idle"

    def prime(self, index: dict[str, str]) -> None:
        self._total_docs = len(index)
        self.state       = "active" if index else "idle"

    def synthesise(self, query: str, candidates: list[dict[str, Any]]) -> str:
        """
        Build a response string from *candidates* for the given *query*.
        """
        self.state = "active"

        if not candidates:
            self.state = "idle"
            return (
                f"[INNM – UP] No relevant documents found for query: \"{query}\"\n"
                f"Total docs indexed: {self._total_docs}"
            )

        lines: list[str] = [
            f"[INNM] Results for: \"{query}\"",
            f"Found {len(candidates)} matching document(s) · "
            f"{self._total_docs} total indexed",
            "",
        ]

        for i, cand in enumerate(candidates, start=1):
            filename = os.path.basename(cand["path"])
            score    = cand.get("combined_score", cand.get("score", 0))
            snippet  = cand["snippet"].strip()

            lines.append(f"─── [{i}] {filename}  (relevance: {score:.1f}) ───")
            lines.append(snippet)
            lines.append("")

        self.state = "idle"
        return "\n".join(lines).rstrip()
