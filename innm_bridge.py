from __future__ import annotations

import os
import sys
from typing import Any, Optional
from pathlib import Path

from app.enforce_bootstrap import debug_enforce_state, get_scope_ctx
from app.zq_pds.hooks import pds_active_mapcore_required


class INNMBridge:
    """Loads and runs the INNM IntelligenceBox from INNM_ENGINE/ibox_core.py."""

    def __init__(self, root_dir: str) -> None:
        self.root_dir = os.path.abspath(root_dir)
        self.innm_engine_dir = os.path.join(self.root_dir, "INNM_ENGINE")
        self.bot: Optional[Any] = None

    def load(self) -> None:
        if not os.path.isdir(self.innm_engine_dir):
            raise FileNotFoundError(f"INNM_ENGINE not found at: {self.innm_engine_dir}")

        if self.innm_engine_dir not in sys.path:
            sys.path.append(self.innm_engine_dir)

        from ibox_core import IntelligenceBox  # type: ignore

        self.bot = IntelligenceBox()

    def reload_map(self) -> bool:
        """Reloads active_mapcore.json inside UpMatrix if supported."""
        if not self.bot:
            return False

        up = getattr(self.bot, "up", None)
        if up and hasattr(up, "reload_mapcore"):
            up.reload_mapcore()
            return True
        return False

    def run_turn(self, user_text: str) -> str:
        if not self.bot:
            raise RuntimeError("INNM bot not loaded")

        # PDS gate: active_mapcore must exist within the mapped scope before INNM turn
        # Default tenant/folder used by woods_builder.py
        tenant_id = "TENANT_LOCAL"
        folder_id = "FOLDER_DEFAULT"
        ctx = get_scope_ctx(tenant_id, folder_id)  # fail-closed if mapping missing
        state = debug_enforce_state()
        suite_root = Path(state["suite_root"]).resolve()
        active_mapcore_path = (suite_root / "WOODS_STORE" / "memory" / "active_mapcore.json").resolve()
        d = pds_active_mapcore_required(tenant_id, folder_id, ctx.root_path, active_mapcore_path)
        if not d.allowed:
            raise FileNotFoundError(f"{d.reason_code}: {d.detail}")

        return self.bot.run_turn(user_text)
