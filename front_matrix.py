"""INNM Front Matrix (Input & Perception)

Offline + deterministic: no files, no network.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Dict


class FrontMatrix:
    def __init__(self) -> None:
        self.stop_words = {
            "what","is","the","of","in","a","an","to","do","show","me",
            "please","can","you","i","we","our","this","that","these","those",
            "and","or","for","on","at","from","with","about","into","as",
        }
        self.intent_rules = [
            ("SUMMARIZATION", {"summarize", "summary", "overview", "brief"}),
            ("RETRIEVAL", {"find", "search", "where", "list", "locate"}),
            ("EXPLANATION", {"explain", "how", "why", "procedure", "steps"}),
        ]

    def _utc_now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def process_input(self, user_text: str) -> Dict:
        print(f"   [FRONT MATRIX] Analyzing: '{user_text}'")

        clean_text = (user_text or "").lower().strip()
        words = re.findall(r"\b\w+\b", clean_text)
        keywords = [w for w in words if w not in self.stop_words]

        intent = "GENERAL_QUERY"
        for intent_name, triggers in self.intent_rules:
            if any(t in clean_text for t in triggers):
                intent = intent_name
                break

        query_vector = {
            "raw_text": user_text,
            "clean_text": clean_text,
            "keywords": keywords,
            "intent": intent,
            "ts_utc": self._utc_now(),
        }

        print(f"   [FRONT MATRIX] Output Vector: {query_vector}")
        return query_vector
