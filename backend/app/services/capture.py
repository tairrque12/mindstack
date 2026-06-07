import base64
import io
import logging
import os

from anthropic import Anthropic
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

logger = logging.getLogger(__name__)

_anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), max_retries=2)

_MAX_DIM = 1024
Image.MAX_IMAGE_PIXELS = 20_000_000  # ~4472×4472 — guard against decompression bombs

_MEDIA_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "GIF": "image/gif",
    "WEBP": "image/webp",
}

_OCR_PROMPT = (
    "Extract ALL text from this image exactly as written. "
    "Preserve the structure and line breaks. "
    "Return only the extracted text, no commentary or explanation."
)


def ocr_image(image_bytes: bytes, source_type: str, source_title: str = "") -> str:
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        logger.error("OCR failed to open image: %s", exc)
        raise RuntimeError("OCR failed: unable to extract text from image") from exc

    if max(img.size) > _MAX_DIM:
        img.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

    fmt = img.format if img.format in _MEDIA_TYPES else "JPEG"
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    encoded = base64.standard_b64encode(buf.getvalue()).decode("utf-8")

    context = f"Source: {source_title}" if source_title else f"Source type: {source_type}"

    try:
        response = _anthropic.messages.create(
            model="claude-opus-4-5",
            max_tokens=2000,
            timeout=30.0,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": _MEDIA_TYPES[fmt],
                            "data": encoded,
                        },
                    },
                    {"type": "text", "text": f"{context}\n\n{_OCR_PROMPT}"},
                ],
            }],
        )
        return response.content[0].text.strip()
    except Exception as exc:
        logger.error("OCR failed: %s", exc)
        raise RuntimeError("OCR failed: unable to extract text from image") from exc
