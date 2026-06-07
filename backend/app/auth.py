import hmac
import os

from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()


def require_api_key(x_api_key: str = Header(None)) -> None:
    expected = os.getenv("API_KEY")
    if not expected or not hmac.compare_digest(x_api_key or "", expected):
        raise HTTPException(status_code=403, detail="Invalid API key")
