# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Flatten a Tiptap rich-text document to plain text.

Most `description`/`value` columns store a Tiptap JSON document (ProseMirror
shape: a tree of nodes, text carried on leaf `{"type": "text", "text": …}`
nodes). Search indexing and comment excerpts only need the words, so we walk the
tree and join every `text` leaf. Deliberately forgiving — malformed or partial
documents yield whatever text is reachable rather than raising.
"""

from typing import Any


def tiptap_to_text(document: Any) -> str:
    """Concatenate every text leaf of a Tiptap document, space-separated.

    Accepts the raw JSON (a `dict`, or `None`/anything else → `""`). `hardBreak`
    and block boundaries are rendered as a single space; runs are collapsed so
    the result is compact.
    """
    if not isinstance(document, dict):
        return ""

    fragments: list[str] = []

    def walk(node: Any) -> None:
        if isinstance(node, list):
            for child in node:
                walk(child)
            return
        if not isinstance(node, dict):
            return
        text = node.get("text")
        if isinstance(text, str) and text:
            fragments.append(text)
        walk(node.get("content"))

    walk(document)
    return " ".join(" ".join(fragments).split())
