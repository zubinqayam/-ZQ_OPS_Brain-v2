#!/usr/bin/env python3
"""
ibox_core.py – INNM Core Orchestrator
Coordinates the FRONT / BACK / UP matrix pipeline.
"""

from __future__ import annotations
import json
import sys
from typing import Any

from front_matrix import FrontMatrix
from back_matrix import BackMatrix
from up_matrix import UpMatrix
from woods_builder import WoodsBuilder


class IboxCore:
    """Central orchestrator for the INNM Triangular Matrix Engine."""

    def __init__(self) -> None:
        self.woods    = WoodsBuilder()
        self.front    = FrontMatrix()
        self.back     = BackMatrix()
        self.up       = UpMatrix()
        self._ready   = False

    # ── Initialisation ─────────────────────────────────────────────────────────

    def load_woods(self, folder_path: str) -> dict[str, Any]:
        """Index a WOODS folder and prime all three matrices."""
        result = self.woods.build(folder_path)
        self.front.prime(self.woods.index)
        self.back.prime(self.woods.index)
        self.up.prime(self.woods.index)
        self._ready = True
        return result

    # ── Query Pipeline ─────────────────────────────────────────────────────────

    def query(self, message: str) -> str:
        """Run a user query through FRONT → BACK → UP and return the response."""
        if not self._ready:
            return json.dumps({
                "status": "error",
                "message": "WOODS folder not loaded. Call load_woods() first.",
            })

        # FRONT: input processing & candidate retrieval
        candidates = self.front.process(message)

        # BACK: context validation & re-ranking
        validated  = self.back.validate(message, candidates)

        # UP: response synthesis
        response   = self.up.synthesise(message, validated)

        return json.dumps({
            "status":    "ok",
            "message":   response,
            "candidate_count": len(validated),
        })

    def status(self) -> dict[str, Any]:
        return {
            "front":     self.front.state,
            "back":      self.back.state,
            "up":        self.up.state,
            "woodsPath": self.woods.folder_path,
            "docCount":  len(self.woods.index),
        }


# ── CLI sidecar entry-point ───────────────────────────────────────────────────

def main() -> None:
    """
    Sidecar mode: read JSON-encoded commands from stdin, write JSON to stdout.
    Each line is a command object: {"cmd": "query"|"load_woods"|"status", ...}
    """
    core = IboxCore()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd_obj = json.loads(line)
        except json.JSONDecodeError as exc:
            print(json.dumps({"status": "error", "message": f"JSON parse error: {exc}"}),
                  flush=True)
            continue

        cmd = cmd_obj.get("cmd", "")

        if cmd == "load_woods":
            result = core.load_woods(cmd_obj.get("path", ""))
            print(json.dumps(result), flush=True)

        elif cmd == "query":
            result = core.query(cmd_obj.get("message", ""))
            print(result, flush=True)

        elif cmd == "status":
            print(json.dumps(core.status()), flush=True)

        else:
            print(json.dumps({
                "status":  "error",
                "message": f"Unknown command: {cmd!r}",
            }), flush=True)


if __name__ == "__main__":
    main()
