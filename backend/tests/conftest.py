import os

import pytest
from fastapi.testclient import TestClient

TEST_API_KEY = "test-secret-key"


@pytest.fixture(scope="session", autouse=True)
def set_test_env():
    os.environ.setdefault("API_KEY", TEST_API_KEY)
    os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
    os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")


@pytest.fixture
def client(set_test_env):
    from app.main import app
    with TestClient(app) as c:
        c.headers.update({"X-API-Key": TEST_API_KEY})
        yield c
