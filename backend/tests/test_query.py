import asyncio
import inspect
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.query import _parse_page, query_brain, retrieve_nodes, synthesize

# ── _parse_page ───────────────────────────────────────────────────────────────

def test_parse_page_extracts_frontmatter():
    text = (
        "---\n"
        "type: concept\n"
        "title: '@garrytan tweet'\n"
        "source_type: tweet\n"
        "source_author: '@garrytan'\n"
        "insight: Build fast\n"
        "principle: Speed is a feature\n"
        "---\n\n"
        "Original tweet content here."
    )
    node = _parse_page(text, "captures/tweet/abc12345")
    assert node["source_type"] == "tweet"
    assert node["source_title"] == "@garrytan tweet"
    assert node["source_author"] == "@garrytan"
    assert node["insight"] == "Build fast"
    assert node["principle"] == "Speed is a feature"
    assert node["raw_content"] == "Original tweet content here."


def test_parse_page_handles_missing_frontmatter():
    node = _parse_page("Just plain content, no frontmatter.", "captures/note/xyz")
    assert node["source_type"] == "note"
    assert node["raw_content"] == "Just plain content, no frontmatter."
    assert node["slug"] == "captures/note/xyz"


def test_parse_page_handles_malformed_yaml():
    text = "---\n: bad yaml: {\n---\n\nContent"
    node = _parse_page(text, "captures/note/bad")
    assert node["source_type"] == "note"


# ── retrieve_nodes ────────────────────────────────────────────────────────────

def _make_subprocess_mock(query_stdout: str, page_stdout: str, returncode: int = 0):
    def side_effect(cmd, **kwargs):
        result = MagicMock()
        result.returncode = returncode
        if cmd[1] == "query":
            result.stdout = query_stdout
        else:
            result.stdout = page_stdout
        return result
    return side_effect


def test_retrieve_nodes_calls_gbrain_query():
    query_out = "[0.9234] captures/tweet/abc12345 -- Build things that matter\n"
    page_out = "---\ntitle: Test tweet\nsource_type: tweet\n---\n\nFull content."

    with patch("app.services.query.subprocess.run", side_effect=_make_subprocess_mock(query_out, page_out)):
        nodes = retrieve_nodes("What should I build?")

    assert len(nodes) == 1
    assert nodes[0]["source_type"] == "tweet"
    assert nodes[0]["score"] == pytest.approx(0.9234)
    assert nodes[0]["raw_content"] == "Full content."


def test_retrieve_nodes_returns_empty_on_no_results():
    with patch("app.services.query.subprocess.run") as mock_sub:
        mock_sub.return_value = MagicMock(returncode=0, stdout="No results.\n")
        nodes = retrieve_nodes("unknown topic")
    assert nodes == []


def test_retrieve_nodes_skips_failed_get():
    query_out = "[0.9234] captures/tweet/abc12345 -- chunk\n"

    def side_effect(cmd, **kwargs):
        result = MagicMock()
        if cmd[1] == "query":
            result.returncode = 0
            result.stdout = query_out
        else:
            result.returncode = 1  # gbrain get fails
            result.stdout = ""
        return result

    with patch("app.services.query.subprocess.run", side_effect=side_effect):
        nodes = retrieve_nodes("query")
    assert nodes == []


def test_retrieve_nodes_parses_multiple_results():
    query_out = (
        "[0.9234] captures/tweet/aaa11111 -- chunk one\n"
        "[0.8100] captures/book/bbb22222 -- chunk two\n"
    )
    page_out = "---\ntitle: Page\nsource_type: note\n---\n\nBody."

    with patch("app.services.query.subprocess.run", side_effect=_make_subprocess_mock(query_out, page_out)):
        nodes = retrieve_nodes("query")

    assert len(nodes) == 2
    assert nodes[0]["score"] > nodes[1]["score"]


# ── synthesize ────────────────────────────────────────────────────────────────

async def _collect(gen) -> str:
    chunks = []
    async for chunk in gen:
        chunks.append(chunk)
    return "".join(chunks)


async def test_synthesize_empty_nodes_returns_message():
    result = await _collect(synthesize("test query", []))
    assert "doesn't have enough" in result


async def test_synthesize_streams_tokens():
    nodes = [{
        "source_type": "tweet", "source_title": "Test", "source_author": None,
        "raw_content": "Content", "insight": "x", "principle": None,
    }]

    async def mock_text_stream():
        for word in ["Build ", "fast ", "or ", "die."]:
            yield word

    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock(return_value=False)
    mock_stream.text_stream = mock_text_stream()

    with patch("app.services.query._anthropic") as mock_client:
        mock_client.messages.stream.return_value = mock_stream
        result = await _collect(synthesize("test query", nodes))

    assert result == "Build fast or die."


async def test_synthesize_claude_failure_yields_error():
    nodes = [{
        "source_type": "note", "source_title": "Test", "source_author": None,
        "raw_content": "Content", "insight": None, "principle": None,
    }]

    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(side_effect=Exception("Claude down"))
    mock_stream.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.query._anthropic") as mock_client:
        mock_client.messages.stream.return_value = mock_stream
        result = await _collect(synthesize("test query", nodes))

    assert "temporarily unavailable" in result


# ── query_brain ───────────────────────────────────────────────────────────────

def test_query_brain_is_async_generator():
    assert inspect.isasyncgenfunction(query_brain)


async def test_query_brain_integrates_retrieve_and_synthesize():
    query_out = "[0.9000] captures/note/abc12345 -- chunk\n"
    page_out = "---\ntitle: Note\nsource_type: note\n---\n\nBody."

    async def mock_text_stream():
        yield "Synthesized answer."

    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock(return_value=False)
    mock_stream.text_stream = mock_text_stream()

    with (
        patch("app.services.query.subprocess.run", side_effect=_make_subprocess_mock(query_out, page_out)),
        patch("app.services.query._anthropic") as mock_client,
    ):
        mock_client.messages.stream.return_value = mock_stream
        result = await _collect(query_brain("What should I do?"))

    assert result == "Synthesized answer."
