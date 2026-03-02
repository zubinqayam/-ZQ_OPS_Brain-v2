"""INNM iBox Controller (Main Brain)"""

from __future__ import annotations

import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
TMA_DIR = os.path.join(CURRENT_DIR, "tma")
if TMA_DIR not in sys.path:
    sys.path.append(TMA_DIR)

from front_matrix import FrontMatrix
from back_matrix import BackMatrix
from up_matrix import UpMatrix

# Pack-3 Unified RAG Firewall (app-layer, offline)
from app.zq_rag_firewall.hooks import build_context_bundle, inject_bundle_into_query_vec
from app.zq_taskmaster.hooks import tm_emit
import hashlib


class IntelligenceBox:
    def __init__(self) -> None:
        print(">> [INNM] Initializing Triangular Matrix Engine...")
        self.front = FrontMatrix()
        self.back = BackMatrix()
        self.up = UpMatrix()
        print(">> [INNM] iBox Ready. Waiting for input.")

    def run_turn(self, user_input: str) -> str:
        print("\n--- STARTING TRIANGULAR CYCLE ---")

        # Taskmaster: INNM turn start
        tm_emit(
            event_type="INNM_TURN_START",
            tenant_id="TENANT_LOCAL",
            folder_id="FOLDER_DEFAULT",
            scope_root="WOODS_STORE/memory",
            payload={"user_input_len": len(user_input or "")},
        )

        query_vec = self.front.process_input(user_input)
        # Build deterministic context bundle and inject into query vector
        # Default tenant/folder (aligns with WOODS builder + Pack-1/2)
        bundle = build_context_bundle("TENANT_LOCAL", "FOLDER_DEFAULT", user_input)
        query_vec = inject_bundle_into_query_vec(query_vec, bundle)
        context_pack = self.back.validate_context(query_vec)
        final_response = self.up.synthesize_response(query_vec, context_pack)

        # Taskmaster: INNM turn end (hash response, no raw content)
        resp_hash = hashlib.sha256((final_response or "").encode("utf-8")).hexdigest()
        tm_emit(
            event_type="INNM_TURN_END",
            tenant_id="TENANT_LOCAL",
            folder_id="FOLDER_DEFAULT",
            scope_root="WOODS_STORE/memory",
            payload={"response_sha256": resp_hash, "response_len": len(final_response or "")},
        )

        print("--- CYCLE COMPLETE ---\n")
        return final_response


if __name__ == "__main__":
    bot = IntelligenceBox()
    print("\n[SYSTEM] Type 'exit' to quit.")
    while True:
        user_in = input("\nYOU: ")
        if user_in.lower().strip() == "exit":
            break
        reply = bot.run_turn(user_in)
        print(f"INNM: {reply}")
