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


# ── /diff: colour sensitivity ──────────────────────────────────────────

def test_diff_reports_ssim_and_color_components(client, png_bytes):
    """The blended score must expose its structural and colour components."""
    img = png_bytes(size=(64, 64), color=(120, 120, 120))

    payload = client.post("/diff", files=_files(img, img)).json()

    assert payload["ssim"] == pytest.approx(1.0, abs=1e-6)
    assert payload["color_score"] == pytest.approx(1.0, abs=1e-6)
    assert payload["score"] == pytest.approx(1.0, abs=1e-6)


def test_diff_full_recolour_is_penalised_by_colour_term(client, png_bytes):
    """
    A whole-canvas recolour keeps structure intact, so SSIM alone stays high.
    The colour term must drag the blended score meaningfully below the
    structural score — this is the fix for SSIM's colour-blindness.
    """
    blue = png_bytes(size=(64, 64), color=(40, 90, 220))
    green = png_bytes(size=(64, 64), color=(40, 200, 90))

    payload = client.post("/diff", files=_files(blue, green)).json()

    # Colour fidelity is clearly hurt, structure is not.
    assert payload["color_score"] < payload["ssim"]
    # The blended score sits below the (deceptively high) structural score.
    assert payload["score"] < payload["ssim"]


# ── /diff: dimension mismatch ──────────────────────────────────────────

def test_diff_normalises_to_the_smaller_common_canvas(client, png_bytes):
    """
    Mismatched dimensions are reconciled by scaling *both* images onto a shared
    box = (min width, min height), not by rejecting the request. The reported
    width/height describe that common canvas (= the diff image size), and the
    true input sizes are surfaced separately.
    """
    large = png_bytes(size=(200, 100), color=(50, 50, 50))
    small = png_bytes(size=(64, 32),   color=(50, 50, 50))

    payload = client.post("/diff", files=_files(large, small)).json()

    assert payload["width"] == 64
    assert payload["height"] == 32
    assert payload["resized"] is True
    assert payload["original_a"] == {"width": 200, "height": 100}
    assert payload["original_b"] == {"width": 64, "height": 32}
    # Same colour under resize remains nearly identical perceptually
    assert payload["score"] > 0.95


def test_diff_is_symmetric_under_size_mismatch(client):
    """
    diff(a, b) must equal diff(b, a). The old "stretch b onto a" logic made the
    score depend on argument order (the larger image got upscaled, inventing
    interpolation blur); normalising to a symmetric common canvas fixes that.
    """
    from PIL import Image

    # A patterned image so the metric has real structure to (dis)agree on.
    def patterned(size):
        img = Image.new("RGB", size, (30, 60, 120))
        for x in range(size[0] // 2):
            for y in range(size[1]):
                img.putpixel((x, y), (220, 200, 40))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    big = patterned((180, 120))
    small = patterned((90, 60))

    forward = client.post("/diff", files=_files(big, small)).json()
    backward = client.post("/diff", files=_files(small, big)).json()

    assert forward["score"] == pytest.approx(backward["score"], abs=1e-9)
    assert forward["ssim"] == pytest.approx(backward["ssim"], abs=1e-9)
    assert forward["color_score"] == pytest.approx(backward["color_score"], abs=1e-9)


def test_diff_pure_rescale_scores_near_identity(client):
    """
    The same content at a different resolution is not a real change. After
    normalisation it must score close to 1.0 — the old code dropped well below
    because upscaling the smaller image blurred it against the sharp original.
    """
    from PIL import Image

    base = Image.new("RGB", (100, 80), (40, 120, 90))
    # Give it edges so SSIM has structure to track through the rescale.
    for x in range(100):
        for y in range(40):
            base.putpixel((x, y), (200, 80, 160))

    def to_png(img):
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    original = to_png(base)
    upscaled = to_png(base.resize((300, 240), Image.LANCZOS))  # same content, 3×

    payload = client.post("/diff", files=_files(original, upscaled)).json()

    assert payload["score"] > 0.97, (
        f"a pure rescale should read as near-identical, got {payload['score']}"
    )


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
