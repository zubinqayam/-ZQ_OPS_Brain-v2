#!/usr/bin/env python3
"""
woods_builder.py – WOODS Folder Indexer
Walks a directory and indexes supported document types for the INNM engine.
"""

from __future__ import annotations
import os
from typing import Any

SUPPORTED_EXTENSIONS = (".txt", ".md", ".csv", ".log")


class WoodsBuilder:
    """
    Build a WOODS (Working Organised Operations Document Store) index
    from a local folder tree.
    """

    def __init__(self) -> None:
        self.folder_path = ""
        self.index: dict[str, str] = {}   # path → content

    def build(self, folder_path: str) -> dict[str, Any]:
        """
        Walk *folder_path* and index all supported documents.

        Returns a summary dict with counts and any errors encountered.
        """
        self.folder_path = folder_path
        self.index       = {}

        if not os.path.isdir(folder_path):
            return {
                "status":  "error",
                "message": f"Path is not a directory: {folder_path}",
                "indexed": 0,
                "errors":  0,
            }

        indexed = 0
        errors  = 0

        for root, _dirs, files in os.walk(folder_path, followlinks=False):
            for fname in files:
                if not fname.lower().endswith(SUPPORTED_EXTENSIONS):
                    continue
                full_path = os.path.join(root, fname)
                try:
                    with open(full_path, encoding="utf-8", errors="replace") as fh:
                        self.index[full_path] = fh.read()
                    indexed += 1
                except OSError:
                    errors += 1

        return {
            "status":  "ok",
            "message": (
                f"WOODS mapping complete.\n"
                f"Folder:  {folder_path}\n"
                f"Indexed: {indexed} file(s)\n"
                f"Errors:  {errors}\n"
                f"Engine:  INNM FRONT/BACK/UP ready."
            ),
            "indexed": indexed,
            "errors":  errors,
        }

    def get_doc(self, path: str) -> str | None:
        """Return the content of a single indexed document, or None."""
        return self.index.get(path)
