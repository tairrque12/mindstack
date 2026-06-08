import asyncio
import logging
import os
import subprocess
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth import require_api_key
from app.services.capture import ocr_image
from app.services.ingest import ingest_node
from app.services.nodes import get_node
from app.services.query import query_brain
from app.services.utils import SourceType

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("API_KEY", "").strip():
        logger.warning("API_KEY not set — API auth disabled (local dev only)")
    yield


app = FastAPI(title="MindStack", lifespan=lifespan)

_CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "https://mindstack.netlify.app,http://localhost:5173,http://127.0.0.1:5173",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ────────────────────────────────────────────────────────────

class CaptureRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50_000)
    source_type: SourceType
    source_title: Optional[str] = None
    source_author: Optional[str] = None
    source_url: Optional[str] = None
    extra_metadata: Optional[dict] = None


class ApplyRequest(BaseModel):
    query: str
    project_context: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/capture")
def capture_text(body: CaptureRequest, _: None = Depends(require_api_key)):
    result = ingest_node(
        content=body.content,
        source_type=body.source_type,
        source_title=body.source_title,
        source_author=body.source_author,
        source_url=body.source_url,
        extra_metadata=body.extra_metadata,
    )
    return {
        "slug": result["slug"],
        "source_type": result["source_type"],
        "title": result.get("title"),
        "insight": result.get("insight"),
        "message": "Captured.",
    }


@app.post("/capture/image")
async def capture_image(
    file: UploadFile = File(...),
    source_type: SourceType = Form(...),
    source_title: str = Form(""),
    _: None = Depends(require_api_key),
):
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported media type — use JPEG, PNG, GIF, or WebP")
    image_bytes = await file.read()
    if len(image_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="File too large — max 10 MB")
    try:
        extracted_text = await asyncio.to_thread(ocr_image, image_bytes, source_type, source_title)
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Image processing failed — please try again")
    try:
        result = await asyncio.to_thread(
            ingest_node,
            content=extracted_text,
            source_type=source_type,
            source_title=source_title or f"{source_type} image",
        )
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Failed to store capture — please try again")
    return {
        "slug": result["slug"],
        "source_type": result["source_type"],
        "title": result.get("title"),
        "insight": result.get("insight"),
        "message": "Captured.",
        "extracted_text": extracted_text,
    }


@app.post("/apply")
async def apply(body: ApplyRequest, _: None = Depends(require_api_key)):
    query = body.query
    if body.project_context:
        query = f"Project context: {body.project_context}\n\nQuestion: {body.query}"

    async def event_stream():
        try:
            async for chunk in query_brain(query):
                safe = chunk.replace("\n", "\ndata: ")
                yield f"data: {safe}\n\n"
            yield "data: [DONE]\n\n"
        except asyncio.CancelledError:
            return

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _source_type_from_slug(slug: str) -> str:
    parts = slug.split("/")
    if len(parts) >= 3 and parts[0] == "captures":
        return parts[1]
    return "note"


@app.get("/nodes")
def get_nodes(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source_type: Optional[str] = Query(None),
    _: None = Depends(require_api_key),
):
    valid_source_types = {s.value for s in SourceType}
    if source_type and source_type not in valid_source_types:
        raise HTTPException(status_code=400, detail=f"Invalid source_type — must be one of: {', '.join(sorted(valid_source_types))}")

    fetch_limit = 100 if source_type else min(offset + limit, 100)
    cmd = ["gbrain", "list", "--limit", str(fetch_limit)]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    nodes = []
    if (
        result.returncode == 0
        and result.stdout.strip()
        and result.stdout.strip() != "No pages found."
    ):
        lines = [line for line in result.stdout.strip().splitlines() if line.strip()]
        for line in lines:
            parts = line.split("\t")
            if len(parts) >= 4:
                slug = parts[0]
                st = _source_type_from_slug(slug)
                if source_type and st != source_type:
                    continue
                nodes.append({
                    "slug": slug,
                    "type": parts[1],
                    "source_type": st,
                    "updated_at": parts[2],
                    "title": parts[3],
                })

    return {"nodes": nodes[offset:offset + limit], "limit": limit, "offset": offset}


@app.get("/nodes/{slug:path}")
def get_node_detail(slug: str, _: None = Depends(require_api_key)):
    node = get_node(slug)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found.")
    return {"node": node}
