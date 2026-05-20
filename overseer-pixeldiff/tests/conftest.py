"""
Shared pytest fixtures for the pixel-diff microservice.

The fixtures here keep the test files focused on behaviour rather than
boilerplate: each test gets a ready-to-use FastAPI TestClient and a small
helper for generating in-memory PNG fixtures.
"""
import base64
import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Make the project root importable so `from main import app` works when
# pytest is invoked from anywhere.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from main import app  # noqa: E402  — import after sys.path manipulation


@pytest.fixture(scope="session")
def client() -> TestClient:
    """A FastAPI TestClient bound to the diff app."""
    return TestClient(app)


@pytest.fixture
def png_bytes():
    """
    Returns a callable that builds a PNG of the requested colour and size,
    in-memory, suitable for posting as multipart form data.

    Example:
        body = png_bytes((10, 10), (255, 0, 0))   # solid-red 10×10 PNG
    """
    def _make(size=(64, 64), color=(255, 255, 255)) -> bytes:
        img = Image.new("RGB", size, color)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    return _make


def decode_diff_image(b64: str) -> Image.Image:
    """Decode the base64 PNG returned by /diff into a PIL Image."""
    raw = base64.b64decode(b64)
    return Image.open(io.BytesIO(raw))
