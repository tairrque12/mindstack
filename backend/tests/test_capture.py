import io
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from app.services.capture import ocr_image


def _make_image_bytes(width: int, height: int, fmt: str = "JPEG") -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def _make_claude_response(text: str) -> MagicMock:
    msg = MagicMock()
    msg.content = [MagicMock(text=text)]
    return msg


def test_ocr_image_calls_claude_vision():
    img_bytes = _make_image_bytes(100, 100)
    with patch("app.services.capture._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response("Extracted text")
        result = ocr_image(img_bytes, "book", "Zero to One")

    assert result == "Extracted text"
    call_kwargs = mock_client.messages.create.call_args
    messages = call_kwargs.kwargs["messages"]
    content = messages[0]["content"]
    image_block = next(b for b in content if b["type"] == "image")
    assert image_block["source"]["type"] == "base64"
    assert image_block["source"]["media_type"] == "image/jpeg"
    assert len(image_block["source"]["data"]) > 0


def test_ocr_image_resizes_large_image():
    img_bytes = _make_image_bytes(2000, 3000)
    with patch("app.services.capture._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response("Extracted text")
        ocr_image(img_bytes, "book")

    call_kwargs = mock_client.messages.create.call_args
    content = call_kwargs.kwargs["messages"][0]["content"]
    image_block = next(b for b in content if b["type"] == "image")

    import base64
    raw = base64.standard_b64decode(image_block["source"]["data"])
    resized = Image.open(io.BytesIO(raw))
    assert max(resized.size) <= 1024


def test_ocr_image_small_image_not_resized():
    img_bytes = _make_image_bytes(400, 300)
    with patch("app.services.capture._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response("Text")
        ocr_image(img_bytes, "note")

    import base64
    call_kwargs = mock_client.messages.create.call_args
    content = call_kwargs.kwargs["messages"][0]["content"]
    image_block = next(b for b in content if b["type"] == "image")
    raw = base64.standard_b64decode(image_block["source"]["data"])
    img = Image.open(io.BytesIO(raw))
    assert img.size == (400, 300)


def test_ocr_image_includes_source_title_in_context():
    img_bytes = _make_image_bytes(100, 100)
    with patch("app.services.capture._anthropic") as mock_client:
        mock_client.messages.create.return_value = _make_claude_response("Text")
        ocr_image(img_bytes, "book", "Atomic Habits")

    call_kwargs = mock_client.messages.create.call_args
    content = call_kwargs.kwargs["messages"][0]["content"]
    text_block = next(b for b in content if b["type"] == "text")
    assert "Atomic Habits" in text_block["text"]


def test_ocr_image_raises_on_claude_failure():
    img_bytes = _make_image_bytes(100, 100)
    with patch("app.services.capture._anthropic") as mock_client:
        mock_client.messages.create.side_effect = Exception("API error")
        with pytest.raises(RuntimeError, match="OCR failed: unable to extract text"):
            ocr_image(img_bytes, "handwritten")
