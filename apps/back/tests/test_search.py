# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Unit tests for the search building blocks that need no database.

The indexer and ranked query are exercised against Postgres in the end-to-end
verification; here we pin the pure helpers: the tsquery builder and the Tiptap
flattener that feed the index and the comment excerpts.
"""

from src.managers.search import build_tsquery_text
from src.models.enum import EntityType, SearchEntityType
from src.utils.tiptap import tiptap_to_text

_DOC = {
    "type": "doc",
    "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]},
        {"type": "paragraph", "content": [{"type": "text", "text": "world"}]},
    ],
}


def test_simple_mode_makes_each_word_a_prefix_term():
    assert build_tsquery_text("full text", "simple") == "full:* & text:*"


def test_simple_mode_strips_tsquery_operators():
    # A user typing operators must not inject tsquery syntax.
    assert build_tsquery_text("a & b | c()", "simple") == "a:* & b:* & c:*"


def test_expert_mode_passes_query_through():
    assert build_tsquery_text("moteur & recherche", "expert") == "moteur & recherche"


def test_blank_query_yields_empty_string():
    assert build_tsquery_text("   ", "simple") == ""


def test_tiptap_flattens_nested_text_nodes():
    assert tiptap_to_text(_DOC) == "Hello world"


def test_tiptap_tolerates_non_document():
    assert tiptap_to_text(None) == ""
    assert tiptap_to_text("not a dict") == ""


def test_search_entity_type_is_a_superset_of_entity_type():
    # Every commentable/votable entity is searchable, plus `comment` itself; the
    # 14 shared values must map 1:1 so `EntityType(value)` resolution holds.
    assert {t.value for t in EntityType} < {t.value for t in SearchEntityType}
    assert SearchEntityType.COMMENT.value == "comment"
    for entity_type in EntityType:
        assert EntityType(SearchEntityType(entity_type.value).value) is entity_type
