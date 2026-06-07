import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from app.database import supabase

load_dotenv()

openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def embed_query(text: str) -> list[float]:
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def retrieve_nodes(query_embedding: list[float], limit: int = 15) -> list[dict]:
    result = supabase.rpc("match_knowledge_nodes", {
        "query_embedding": query_embedding,
        "match_count": limit
    }).execute()
    return result.data

def synthesize(query: str, nodes: list[dict]) -> str:
    if not nodes:
        return "Your brain doesn't have enough on this yet. Start adding content related to this topic."

    nodes_text = ""
    for i, node in enumerate(nodes, 1):
        nodes_text += f"""
[{i}] {node.get('source_type', '').upper()} — {node.get('source_title', 'Unknown')}
{f"by {node['source_author']}" if node.get('source_author') else ''}
Content: {node.get('raw_content', '')}
Insight: {node.get('insight', '')}
Principle: {node.get('principle', '')}
---"""

    prompt = f"""You are someone's second brain. They have come to you with something they are thinking about, want to build, or want to apply today.

Their question: {query}

Here is the most relevant knowledge they have personally saved, read, highlighted, or learned:

{nodes_text}

Your job:
1. Identify the 3-5 most relevant insights from their knowledge that directly apply
2. Show exactly how each insight connects to their specific question
3. Give a concrete action plan built entirely from THEIR OWN learning — not generic advice
4. Flag any tensions or contradictions in what they have saved that are relevant
5. End with one sharp question that would push their thinking further

Rules:
- Speak directly to them in second person
- Cite every insight with its source in brackets
- Be specific and actionable — no vague motivational language
- If their knowledge is thin on this topic, say so honestly and tell them what to go learn"""

    response = anthropic.messages.create(
        model="claude-opus-4-5",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text

def query_brain(query: str) -> dict:
    # Embed the query
    query_embedding = embed_query(query)

    # Retrieve relevant nodes
    nodes = retrieve_nodes(query_embedding)

    # Synthesize action plan
    synthesis = synthesize(query, nodes)

    # Increment retrieval count on surfaced nodes
    if nodes:
        node_ids = [n["id"] for n in nodes]
        for node_id in node_ids:
            supabase.rpc("increment_retrieval_count", {"node_id": node_id}).execute()

    return {
        "query": query,
        "synthesis": synthesis,
        "nodes_used": len(nodes),
        "sources": [
            {
                "title": n.get("source_title"),
                "author": n.get("source_author"),
                "type": n.get("source_type"),
                "insight": n.get("insight")
            }
            for n in nodes
        ]
    }
