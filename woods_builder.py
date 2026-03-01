from __future__ import annotations

import json
import os
import time
from typing import Dict, List, Set

from app.enforce_bootstrap import get_runtime, get_scope_ctx, set_scope_mapping
from app.zq_enforce.hooks import enforce_list_files, enforce_read_text
from app.zq_pds.hooks import pds_index_start, pds_file_read

SUPPORTED_EXT: Set[str] = {".txt", ".md", ".csv", ".log"}


def _read_text_file(path: str, max_bytes: int = 2_000_000) -> str:
    with open(path, "rb") as f:
        data = f.read(max_bytes)
    return data.decode("utf-8", errors="replace")


def _chunk_text(text: str, chunk_size: int = 700) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def build_mapcore(folder_path: str) -> Dict:
    # Set scope mapping with defaults
    tenant_id = "TENANT_LOCAL"
    folder_id = "FOLDER_DEFAULT"
    set_scope_mapping(tenant_id, folder_id, folder_path)

    runtime = get_runtime()
    ctx = get_scope_ctx(tenant_id, folder_id)
    # PDS gate: indexing start
    d0 = pds_index_start(tenant_id, folder_id, ctx.root_path)
    if not d0.allowed:
        raise PermissionError(f"{d0.reason_code}: {d0.detail}")

    grid_b_content: List[Dict] = []

    files = enforce_list_files(runtime, ctx)
    for full_path in files:
        # full_path is a Path from Pack-2
        ext = full_path.suffix.lower()
        # PDS gate: file read decision (includes app allowlist)
        d1 = pds_file_read(tenant_id, folder_id, ctx.root_path, full_path, required_ext_allowlist=SUPPORTED_EXT)
        if not d1.allowed:
            continue
        try:
            raw = enforce_read_text(runtime, ctx, full_path)
        except Exception:
            continue

        # OPTIMIZATION: Build the final list structure directly to avoid a second loop.
        # This is more memory-efficient as it avoids creating an intermediate list of dicts
        # with extra 'src_file' keys, only to discard them immediately.
        for c in _chunk_text(raw):
            grid_b_content.append({"text": c})

    return {
        "schema_version": "woods_mapcore_v1_min",
        "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_folder": os.path.abspath(folder_path),
        "grid_b_content": grid_b_content,
        "meta": {
            "chunk_count": len(grid_b_content),
            "supported_ext": sorted(list(SUPPORTED_EXT)),
        },
    }


def write_active_mapcore(active_mapcore_path: str, mapcore: Dict) -> None:
    os.makedirs(os.path.dirname(active_mapcore_path), exist_ok=True)
    with open(active_mapcore_path, "w", encoding="utf-8") as f:
        json.dump(mapcore, f, indent=2, ensure_ascii=False)


def read_active_mapcore_meta(active_mapcore_path: str) -> str:
    if not os.path.exists(active_mapcore_path):
        return "No active_mapcore.json found."

    try:
        with open(active_mapcore_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        src = data.get("source_folder", "unknown")
        cnt = (data.get("meta") or {}).get("chunk_count", "unknown")
        gen = data.get("generated_at_utc", "unknown")
        return f"WOODS: mapped {cnt} chunks | source: {src} | generated: {gen}"
    except Exception:
        return "active_mapcore.json exists but could not be parsed."


def get_active_mapcore_data(active_mapcore_path: str) -> Dict:
    if not os.path.exists(active_mapcore_path):
        return {}
    try:
        with open(active_mapcore_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}
