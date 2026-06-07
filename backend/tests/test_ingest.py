import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.ingest import extract_metadata, ingest_node


# ── extract_metadata ─────────────────────────────────────────────────────────

def _make_claude_response(text: str) -> MagicMock:
    msg = MagicMock()
    msg.content = [MagicMock(text=text)]
    return msg


def test_extract_metadata_success():
    payload = {
        "insight": "Consistency beats intensity",
        "principle": "Small daily habits compound",
        "applicable_domains": ["health", "fitness"],
        "open_questions": ["What triggers consistency?"],
        "tags": ["habits", "fitness"],
    }
    with patch("app.services.ingest._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response(json.dumps(payload))
        result = extract_metadata("Train every day.", "book", "Atomic Habits")
    assert result["insight"] == "Consistency beats intensity"
    assert "fitness" in result["applicable_domains"]


def test_extract_metadata_malformed_json():
    with patch("app.services.ingest._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response("Sure! Here is the JSON: {bad}")
        result = extract_metadata("some content", "tweet")
    assert result == {}


def test_extract_metadata_claude_failure():
    with patch("app.services.ingest._anthropic") as mock_client:
        mock_client.messages.create.side_effect = Exception("API unavailable")
        result = extract_metadata("some content", "podcast")
    assert result == {}


def test_extract_metadata_strips_code_fences():
    payload = {"insight": "Test", "principle": None, "applicable_domains": [], "open_questions": [], "tags": []}
    fenced = f"```json\n{json.dumps(payload)}\n```"
    with patch("app.services.ingest._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response(fenced)
        result = extract_metadata("content", "note")
    assert result["insight"] == "Test"


# ── ingest_node ───────────────────────────────────────────────────────────────

def test_ingest_node_calls_gbrain_put():
    with (
        patch("app.services.ingest._anthropic") as mock_claude,
        patch("app.services.ingest.subprocess.run") as mock_sub,
    ):
        mock_claude.messages.create.return_value = _make_claude_response(
            '{"insight":"x","principle":null,"applicable_domains":[],"open_questions":[],"tags":["product"]}'
        )
        mock_sub.return_value = MagicMock(returncode=0)
        result = ingest_node("Great lesson.", "tweet", source_title="@garrytan")

    call_args = mock_sub.call_args
    cmd = call_args.args[0]
    assert cmd[0] == "gbrain"
    assert cmd[1] == "put"
    assert cmd[2].startswith("captures/tweet/")
    assert "Great lesson." in call_args.kwargs["input"]
    assert result["source_type"] == "tweet"
    assert result["slug"].startswith("captures/tweet/")


def test_ingest_node_frontmatter_contains_core_fields():
    with (
        patch("app.services.ingest._anthropic") as mock_claude,
        patch("app.services.ingest.subprocess.run") as mock_sub,
    ):
        mock_claude.messages.create.return_value = _make_claude_response(
            '{"insight":"i","principle":"p","applicable_domains":["business"],"open_questions":[],"tags":["b"]}'
        )
        mock_sub.return_value = MagicMock(returncode=0)
        ingest_node(
            "Content here",
            "book",
            source_title="Zero to One",
            source_author="Peter Thiel",
            source_url="https://example.com",
        )

    page_md = mock_sub.call_args.kwargs["input"]
    assert "source_type: book" in page_md
    assert "source_author: Peter Thiel" in page_md
    assert "source_url: https://example.com" in page_md
    assert "insight: i" in page_md
    assert "tags:" in page_md


def test_ingest_node_extra_metadata_merged():
    with (
        patch("app.services.ingest._anthropic") as mock_claude,
        patch("app.services.ingest.subprocess.run") as mock_sub,
    ):
        mock_claude.messages.create.return_value = _make_claude_response("{}")
        mock_sub.return_value = MagicMock(returncode=0)
        ingest_node(
            "Podcast content",
            "podcast",
            extra_metadata={"duration_seconds": 3600, "episode_title": "Ep 42"},
        )

    page_md = mock_sub.call_args.kwargs["input"]
    assert "duration_seconds: 3600" in page_md
    assert "episode_title: Ep 42" in page_md


def test_ingest_node_extra_metadata_cannot_overwrite_core():
    with (
        patch("app.services.ingest._anthropic") as mock_claude,
        patch("app.services.ingest.subprocess.run") as mock_sub,
    ):
        mock_claude.messages.create.return_value = _make_claude_response("{}")
        mock_sub.return_value = MagicMock(returncode=0)
        ingest_node(
            "Content",
            "note",
            extra_metadata={"source_type": "INJECTED"},
        )

    page_md = mock_sub.call_args.kwargs["input"]
    assert "INJECTED" not in page_md


def test_ingest_node_gbrain_not_in_path():
    with (
        patch("app.services.ingest._anthropic") as mock_claude,
        patch("app.services.ingest.subprocess.run", side_effect=FileNotFoundError),
    ):
        mock_claude.messages.create.return_value = _make_claude_response("{}")
        with pytest.raises(RuntimeError, match="GBrain CLI not available"):
            ingest_node("Content", "note")


def test_ingest_node_saves_even_when_metadata_fails():
    """Content must be preserved even when Claude metadata extraction fails."""
    with (
        patch("app.services.ingest._anthropic") as mock_claude,
        patch("app.services.ingest.subprocess.run") as mock_sub,
    ):
        mock_claude.messages.create.side_effect = Exception("Claude down")
        mock_sub.return_value = MagicMock(returncode=0)
        result = ingest_node("Important lesson I can't lose.", "voice_memo")

    assert result["slug"].startswith("captures/voice_memo/")
    page_md = mock_sub.call_args.kwargs["input"]
    assert "Important lesson I can't lose." in page_md
