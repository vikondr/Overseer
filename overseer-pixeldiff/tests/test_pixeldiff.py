"""
End-to-end tests for the perceptual-diff microservice.

These tests pin down the contract that the rest of the system depends on:
identical inputs produce a similarity of 1.0, different inputs produce
strictly lower scores, and dimension mismatches are reconciled via resize
rather than rejected. The service is the load-bearing original-contribution
piece of the thesis — these tests are written to be read aloud at defense.
"""
import io

import pytest

from tests.conftest import decode_diff_image


def _files(a: bytes, b: bytes):
    """Helper to assemble the multipart payload the endpoint expects."""
    return {
        "image_a": ("a.png", io.BytesIO(a), "image/png"),
        "image_b": ("b.png", io.BytesIO(b), "image/png"),
    }


# ── /health ────────────────────────────────────────────────────────────

def test_health_endpoint_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ── /diff: identical inputs ────────────────────────────────────────────

def test_diff_identical_images_score_exactly_one(client, png_bytes):
    """SSIM of a buffer against itself must be 1.0 — the identity case."""
    img = png_bytes(size=(64, 64), color=(120, 120, 120))

    response = client.post("/diff", files=_files(img, img))

    assert response.status_code == 200
    payload = response.json()
    assert payload["score"] == pytest.approx(1.0, abs=1e-6)
    assert payload["width"] == 64
    assert payload["height"] == 64
    assert "diff_image" in payload


def test_diff_returns_valid_png_visualisation(client, png_bytes):
    """The diff_image must be a decodable PNG of the compared dimensions."""
    a = png_bytes(size=(80, 40), color=(0, 0, 0))
    b = png_bytes(size=(80, 40), color=(255, 255, 255))

    payload = client.post("/diff", files=_files(a, b)).json()
    diff_image = decode_diff_image(payload["diff_image"])

    assert diff_image.format == "PNG"
    assert diff_image.size == (80, 40)


# ── /diff: different inputs ────────────────────────────────────────────

def test_diff_completely_different_images_score_well_below_one(client, png_bytes):
    """Black vs white must score noticeably below 1.0 — the antithesis of identity."""
    black = png_bytes(size=(64, 64), color=(0, 0, 0))
    white = png_bytes(size=(64, 64), color=(255, 255, 255))

    payload = client.post("/diff", files=_files(black, white)).json()

    assert payload["score"] < 0.5, (
        f"expected sharply lower SSIM for opposite-colour images, got {payload['score']}"
    )


def test_diff_partial_change_scores_between_identity_and_total_difference(client, png_bytes):
    """A small local change must score strictly less than identity but well above the worst case."""
    from PIL import Image
    base = Image.new("RGB", (100, 100), (128, 128, 128))
    perturbed = Image.new("RGB", (100, 100), (128, 128, 128))
    # Repaint a tiny 10×10 corner so only ~1 % of pixels differ.
    for x in range(10):
        for y in range(10):
            perturbed.putpixel((x, y), (255, 0, 0))

    def to_png(img):
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    payload = client.post(
        "/diff",
        files=_files(to_png(base), to_png(perturbed)),
    ).json()

    score = payload["score"]
    assert 0.5 < score < 1.0, (
        f"expected a partial-change score between 0.5 and 1.0, got {score}"
    )


# ── /diff: dimension mismatch ──────────────────────────────────────────

def test_diff_resizes_image_b_to_match_image_a(client, png_bytes):
    """
    Mismatched dimensions are reconciled by resizing image_b to image_a's
    size, not by rejecting the request. The reported width/height reflect
    image_a after resizing.
    """
    large = png_bytes(size=(200, 100), color=(50, 50, 50))
    small = png_bytes(size=(64, 32),   color=(50, 50, 50))

    payload = client.post("/diff", files=_files(large, small)).json()

    assert payload["width"] == 200
    assert payload["height"] == 100
    # Same colour under resize remains nearly identical perceptually
    assert payload["score"] > 0.95


# ── /diff: malformed input ────────────────────────────────────────────

def test_diff_rejects_non_image_payload(client, png_bytes):
    """A garbage upload must come back as 400, not 500."""
    response = client.post(
        "/diff",
        files={
            "image_a": ("bad.png", io.BytesIO(b"not really an image"), "image/png"),
            "image_b": ("ok.png",  io.BytesIO(png_bytes()),           "image/png"),
        },
    )
    assert response.status_code == 400
    assert "Could not read image" in response.json()["detail"]


def test_diff_requires_both_files(client, png_bytes):
    """Sending only image_a yields a 422 validation error from FastAPI."""
    response = client.post(
        "/diff",
        files={"image_a": ("ok.png", io.BytesIO(png_bytes()), "image/png")},
    )
    assert response.status_code == 422
