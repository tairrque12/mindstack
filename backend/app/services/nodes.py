import logging
import subprocess

from app.services.query import _parse_page

logger = logging.getLogger(__name__)


def get_node(slug: str) -> dict | None:
    """Fetch a single knowledge node by GBrain slug."""
    result = subprocess.run(
        ["gbrain", "get", slug],
        capture_output=True,
        text=True,
        timeout=15,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    return _parse_page(result.stdout, slug)
