import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from app.database import supabase

load_dotenv()

openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def generate_embedding(text: str) -> list[float]:
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

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

    response = anthropic.messages.create(
        model="claude-opus-4-5",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()

    # Strip markdown code fences if present
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    text = text.strip()

    return json.loads(text)

def ingest_node(
    content: str,
    source_type: str,
    source_title: str = None,
    source_author: str = None,
    source_url: str = None,
    readwise_id: int = None,
    highlighted_at: str = None
) -> dict:
    # Generate embedding
    embedding = generate_embedding(content)

    # Extract metadata via Claude
    metadata = extract_metadata(content, source_type, source_title or "")

    # Build the node
    node = {
        "raw_content": content,
        "source_type": source_type,
        "source_title": source_title,
        "source_author": source_author,
        "source_url": source_url,
        "embedding": embedding,
        "insight": metadata.get("insight"),
        "principle": metadata.get("principle"),
        "applicable_domains": metadata.get("applicable_domains", []),
        "open_questions": metadata.get("open_questions", []),
        "tags": metadata.get("tags", []),
        "readwise_id": readwise_id,
        "highlighted_at": highlighted_at
    }

    # Remove None values
    node = {k: v for k, v in node.items() if v is not None}

    # Upsert into Supabase
    if readwise_id:
        result = supabase.table("knowledge_nodes").upsert(
            node, on_conflict="readwise_id"
        ).execute()
    else:
        result = supabase.table("knowledge_nodes").insert(node).execute()

    return result.data[0]
