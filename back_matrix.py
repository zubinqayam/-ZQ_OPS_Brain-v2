"""INNM Back Matrix (Context & Validation)

Offline + deterministic.
"""

from __future__ import annotations

from typing import Dict, List


class BackMatrix:
    def __init__(self) -> None:
        self.conversation_history: List[Dict] = []

    def validate_context(self, query_vector: Dict) -> Dict:
        print("   [BACK MATRIX] Validating Context...")

        constraint_flags: List[str] = []

        if self.conversation_history:
            last_keywords = self.conversation_history[-1].get("keywords", [])
            if set(query_vector.get("keywords", [])) == set(last_keywords):
                constraint_flags.append("REPEATED_QUERY")
                print("   [BACK MATRIX] Note: User repeated the same keyword set.")

        scope_constraint = "STRICT_MAPCORE_ONLY"

        self.conversation_history.append(query_vector)

        return {
            "history_depth": len(self.conversation_history),
            "constraints": constraint_flags,
            "scope_mode": scope_constraint,
        }
