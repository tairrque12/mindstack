import os
from enum import Enum

from openai import OpenAI


class SourceType(str, Enum):
    BOOK = "book"
    TWEET = "tweet"
    YOUTUBE = "youtube"
    PODCAST = "podcast"
    VOICE_MEMO = "voice_memo"
    LINKEDIN = "linkedin"
    REDDIT = "reddit"
    CONVERSATION = "conversation"
    HANDWRITTEN = "handwritten"
    NOTE = "note"


def generate_embedding(text: str) -> list[float]:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding
