from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_API_KEY


# ── POST /capture ─────────────────────────────────────────────────────────────

def test_capture_text_success(client):
    with patch("app.main.ingest_node") as mock_ingest:
        mock_ingest.return_value = {"slug": "captures/tweet/abc12345", "source_type": "tweet"}
        resp = client.post("/capture", json={
            "content": "Great lesson about building fast.",
            "source_type": "tweet",
            "source_title": "@garrytan",
        })
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "captures/tweet/abc12345"
    assert data["message"] == "Captured."


def test_capture_text_with_extra_metadata(client):
    with patch("app.main.ingest_node") as mock_ingest:
        mock_ingest.return_value = {"slug": "captures/podcast/abc12345", "source_type": "podcast"}
        resp = client.post("/capture", json={
            "content": "Podcast transcript chunk.",
            "source_type": "podcast",
            "extra_metadata": {"duration_seconds": 3600, "episode_title": "Ep 42"},
        })
    assert resp.status_code == 200
    call_kwargs = mock_ingest.call_args.kwargs
    assert call_kwargs["extra_metadata"]["duration_seconds"] == 3600


# ── POST /capture/image ───────────────────────────────────────────────────────

def test_capture_image_success(client):
    with (
        patch("app.main.ocr_image") as mock_ocr,
        patch("app.main.ingest_node") as mock_ingest,
    ):
        mock_ocr.return_value = "Extracted text from book page."
        mock_ingest.return_value = {"slug": "captures/book/abc12345", "source_type": "book"}
        resp = client.post(
            "/capture/image",
            data={"source_type": "book", "source_title": "Zero to One"},
            files={"file": ("page.jpg", b"\xff\xd8\xff" + b"\x00" * 100, "image/jpeg")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["extracted_text"] == "Extracted text from book page."
    assert data["slug"] == "captures/book/abc12345"


def test_capture_image_ocr_failure_returns_500(client):
    with patch("app.main.ocr_image", side_effect=RuntimeError("OCR failed: API error")):
        resp = client.post(
            "/capture/image",
            data={"source_type": "handwritten"},
            files={"file": ("note.jpg", b"\xff\xd8\xff" + b"\x00" * 100, "image/jpeg")},
        )
    assert resp.status_code == 500


# ── POST /apply ───────────────────────────────────────────────────────────────

def test_apply_streams_sse(client):
    async def mock_gen(query):
        yield "First chunk"
        yield " second chunk"

    with patch("app.main.query_brain", side_effect=mock_gen):
        resp = client.post("/apply", json={"query": "What should I build?"})

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")
    body = resp.text
    assert "data: First chunk" in body
    assert "data:  second chunk" in body
    assert "data: [DONE]" in body


def test_apply_prepends_project_context(client):
    async def mock_gen(query):
        yield f"echo:{query}"

    with patch("app.main.query_brain", side_effect=mock_gen) as mock_qb:
        client.post("/apply", json={
            "query": "How do I onboard users?",
            "project_context": "Building MindStack v1",
        })

    called_query = mock_qb.call_args.args[0]
    assert "Building MindStack v1" in called_query
    assert "How do I onboard users?" in called_query


# ── GET /nodes ────────────────────────────────────────────────────────────────

def test_get_nodes_success(client):
    mock_output = (
        "captures/tweet/abc\tconcept\t2026-06-07\t@garrytan tweet\n"
        "captures/book/def\tconcept\t2026-06-06\tZero to One highlight\n"
    )
    with patch("app.main.subprocess.run") as mock_sub:
        mock_sub.return_value = MagicMock(returncode=0, stdout=mock_output)
        resp = client.get("/nodes")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["nodes"]) == 2
    assert data["nodes"][0]["slug"] == "captures/tweet/abc"
    assert data["nodes"][0]["title"] == "@garrytan tweet"


def test_get_nodes_empty_brain(client):
    with patch("app.main.subprocess.run") as mock_sub:
        mock_sub.return_value = MagicMock(returncode=0, stdout="No pages found.\n")
        resp = client.get("/nodes")
    assert resp.status_code == 200
    assert resp.json()["nodes"] == []


def test_get_nodes_pagination(client):
    lines = "\n".join(
        f"captures/note/{i:03d}\tconcept\t2026-06-07\tNote {i}" for i in range(5)
    )
    with patch("app.main.subprocess.run") as mock_sub:
        mock_sub.return_value = MagicMock(returncode=0, stdout=lines + "\n")
        resp = client.get("/nodes?limit=2&offset=2")
    data = resp.json()
    assert len(data["nodes"]) == 2
    assert data["nodes"][0]["slug"] == "captures/note/002"


# ── Auth ──────────────────────────────────────────────────────────────────────

def test_auth_missing_key():
    from app.main import app
    c = TestClient(app)
    resp = c.post("/capture", json={"content": "test", "source_type": "note"})
    assert resp.status_code == 403


def test_auth_wrong_key():
    from app.main import app
    c = TestClient(app)
    resp = c.post(
        "/capture",
        json={"content": "test", "source_type": "note"},
        headers={"X-API-Key": "wrong-key"},
    )
    assert resp.status_code == 403
