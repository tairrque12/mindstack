import json
import logging
import os
import re
import subprocess
from datetime import datetime, timezone
from uuid import uuid4

import yaml
from anthropic import Anthropic
from dotenv import load_dotenv

from app.services.utils import SourceType

load_dotenv()

logger = logging.getLogger(__name__)

_anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"), max_retries=2)

_CORE_FRONTMATTER_KEYS = frozenset({
    "title", "source_type", "captured_at", "source_author", "source_url",
    "tags", "insight", "principle", "applicable_domains", "open_questions",
})


def extract_metadata(content: str, source_type: str, source_title: str = "") -> dict:
    prompt = f"""You are processing a piece of knowledge for someone's second brain.

Source type: {source_type}
Source: {source_title}
Content: {content}

Return ONLY a raw JSON object with no markdown, no backticks, no explanation. Just the JSON.

{{
  "insight": "one sentence — the core idea distilled simply",
  "principle": "the underlying mental model or rule, or null if none",
  "applicable_domains": ["list", "of", "domains"],
  "open_questions": ["questions this raises"],
  "tags": ["relevant", "tags"]
}}

Domains can include: business, product, mindset, design, engineering, health, relationships, creativity, leadership, investing, learning, communication, fitness, weightlifting, running.

For fitness content specifically:
- Tag weightlifting content with both fitness and weightlifting
- Tag running content with both fitness and running
- Extract performance principles, training methodologies, and recovery insights as principles"""

    try:
        response = _anthropic.messages.create(
            model="claude-opus-4-5",
            max_tokens=500,
            timeout=30.0,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("extract_metadata: Claude returned non-JSON; storing without metadata")
            return {}
    except Exception:
        logger.warning("extract_metadata: Claude call failed after retries; storing without metadata")
        return {}


def ingest_node(
    content: str,
    source_type: str,
    source_title: str = None,
    source_author: str = None,
    source_url: str = None,
    readwise_id: int = None,
    highlighted_at: str = None,
    extra_metadata: dict = None,
) -> dict:
    # Normalize SourceType enum to plain str for safe YAML serialization
    source_type = getattr(source_type, "value", source_type)

    metadata = extract_metadata(content, source_type, source_title or "")

    slug = f"captures/{source_type}/{uuid4().hex}"

    display_title = source_title
    if not display_title and content.strip():
        first_line = content.strip().split("\n", 1)[0]
        display_title = first_line if len(first_line) <= 80 else f"{first_line[:77]}..."

    frontmatter: dict = {
        "title": display_title or f"{source_type} capture",
        "source_type": source_type,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }
    if source_author:
        frontmatter["source_author"] = source_author
    if source_url:
        frontmatter["source_url"] = source_url
    if readwise_id:
        frontmatter["readwise_id"] = readwise_id
    if highlighted_at:
        frontmatter["highlighted_at"] = highlighted_at
    if metadata.get("tags"):
        frontmatter["tags"] = metadata["tags"]
    if metadata.get("insight"):
        frontmatter["insight"] = metadata["insight"]
    if metadata.get("principle"):
        frontmatter["principle"] = metadata["principle"]
    if metadata.get("applicable_domains"):
        frontmatter["applicable_domains"] = metadata["applicable_domains"]
    if metadata.get("open_questions"):
        frontmatter["open_questions"] = metadata["open_questions"]
    if extra_metadata:
        for k, v in extra_metadata.items():
            if k not in _CORE_FRONTMATTER_KEYS:
                frontmatter[k] = v

    page_md = (
        f"---\n"
        f"{yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)}"
        f"---\n\n"
        f"{content}"
    )

    try:
        subprocess.run(
            ["gbrain", "put", slug],
            input=page_md,
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
    except FileNotFoundError:
        raise RuntimeError("GBrain CLI not available — ensure 'gbrain' is in PATH")
    except subprocess.CalledProcessError as exc:
        logger.error("gbrain put failed (rc=%d): %s", exc.returncode, exc.stderr)
        raise RuntimeError("Storage backend error — knowledge not saved") from exc

    return {
        "slug": slug,
        "source_type": source_type,
        "title": frontmatter["title"],
        "insight": metadata.get("insight"),
    }
