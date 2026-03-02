"""INNM Up Matrix (Synthesis & Execution)

Reads WOODS active_mapcore.json only.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional, Tuple


class UpMatrix:
    def __init__(self, memory_path: Optional[str] = None) -> None:
        if memory_path is None:
            self.memory_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "WOODS_STORE", "memory", "active_mapcore.json")
            )
        else:
            self.memory_path = os.path.abspath(memory_path)

        self.map_data: Optional[Dict] = self.load_mapcore()

    def load_mapcore(self) -> Optional[Dict]:
        try:
            if not os.path.exists(self.memory_path):
                cwd = os.getcwd()
                raise FileNotFoundError(f"WOODS Memory not found at: {self.memory_path} (cwd: {cwd})")
            with open(self.memory_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"   [UP MATRIX] Loaded WOODS Memory: {self.memory_path}")
            return data
        except Exception as e:
            print(f"   [UP MATRIX] Error loading WOODS Memory: {e}")
            raise

    def reload_mapcore(self) -> None:
        self.map_data = self.load_mapcore()

    def synthesize_response(self, query_vector: Dict, context_packet: Dict) -> str:
        print("   [UP MATRIX] Synthesizing Answer from WOODS...")

        if not self.map_data:
            return "Error: INNM cannot feel the WOODS. Is a folder connected and mapped (active_mapcore.json exists)?"

        keywords = query_vector.get("keywords", [])
        if not keywords:
            return "Please provide at least one meaningful keyword (your input is currently too generic)."

        grid = self.map_data.get("grid_b_content", [])
        if not isinstance(grid, list) or not grid:
            return "WOODS Mapcore is loaded, but Grid B content is empty. Re-run WOODS mapping on a folder with text."

        found: List[Tuple[int, str]] = []
        for item in grid:
            text = str(item.get("text", ""))
            tl = text.lower()
            score = sum(1 for k in keywords if k in tl)
            if score > 0:
                found.append((score, text))

        found.sort(key=lambda x: x[0], reverse=True)
        top = found[:3]

        if not top:
            return "I searched the connected WOODS but found no matching data for those keywords.\n" + f"Keywords: {', '.join(keywords)}"

        lines: List[str] = []
        lines.append(f"Based on the connected folder, here is what I found regarding: {', '.join(keywords)}")
        lines.append("")
        for score, text in top:
            snippet = text.strip().replace("\n", " ")
            if len(snippet) > 220:
                snippet = snippet[:220] + "..."
            lines.append(f"- {snippet}  [Relevance: {score}]")
        lines.append("")
        lines.append("(Source: WOODS Grid B)")

        if "REPEATED_QUERY" in context_packet.get("constraints", []):
            lines.append("")
            lines.append("Note: You asked a very similar query in the previous turn. If you want, specify a new keyword.")

        return "\n".join(lines)
