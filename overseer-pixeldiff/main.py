import io
import base64
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# The overall match score is a weighted blend of two complementary metrics:
# SSIM captures *structure* (layout, shapes, edges) but is largely colour-blind,
# so a full recolour barely moves it. The colour-fidelity term captures exactly
# what SSIM misses. SSIM stays the headline (it is the perceptual contribution),
# colour fidelity is the corrective.
SSIM_WEIGHT = 0.6
COLOR_WEIGHT = 0.4

app = FastAPI(title="Overseer Pixel Diff", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def load_image(upload: UploadFile) -> Image.Image:
    try:
        return Image.open(io.BytesIO(upload.file.read())).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail=f"Could not read image: {upload.filename}")


def _fit_with_pad(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    """
    Scale img to fit inside ``box`` (w, h) preserving its aspect ratio, then
    pad the remainder so the result is exactly box-sized. Content is anchored
    top-left to mirror a design canvas origin; padding is white.

    The box is always <= the image in both dimensions (see normalize_pair), so
    this only ever *downscales* — it never invents interpolation blur by
    enlarging, and it never stretches, so content is not distorted.
    """
    box_w, box_h = box
    w, h = img.size
    scale = min(box_w / w, box_h / h)
    new_w = max(1, round(w * scale))
    new_h = max(1, round(h * scale))
    # Skip the resample entirely when the image already fits the box — running
    # LANCZOS at scale 1.0 is not a no-op (it re-convolves and softens edges),
    # which would degrade the un-scaled image relative to the scaled one.
    resized = img if (new_w, new_h) == (w, h) else img.resize((new_w, new_h), Image.LANCZOS)
    if (new_w, new_h) == (box_w, box_h):
        return resized
    canvas = Image.new("RGB", (box_w, box_h), (255, 255, 255))
    canvas.paste(resized, (0, 0))
    return canvas


def normalize_pair(img_a: Image.Image, img_b: Image.Image):
    """
    Bring two images onto a common, comparable canvas before diffing.

    Both are scaled to fit a shared box = (min width, min height) of the two,
    preserving aspect ratio and padding to that exact size. Because the box is
    a *symmetric* function of the two sizes, the comparison is order-independent
    (diff(a, b) == diff(b, a)) — unlike stretching one image onto the other,
    which made the score depend on which version you picked as "before". Where
    aspect ratios differ, the unmatched region reads honestly as a difference
    rather than distorting the whole frame.
    """
    if img_a.size == img_b.size:
        return img_a, img_b
    box = (min(img_a.width, img_b.width), min(img_a.height, img_b.height))
    return _fit_with_pad(img_a, box), _fit_with_pad(img_b, box)


def color_similarity(arr_a: np.ndarray, arr_b: np.ndarray) -> float:
    """
    Colour fidelity in 0..1 (1 = identical colour).

    Mean absolute per-channel difference, normalised by the 0..255 range and
    inverted. Unlike SSIM this responds directly to recolouring — a blue→green
    button or a re-themed canvas pulls this term down even when structure is
    untouched.
    """
    mean_abs_diff = float(np.mean(np.abs(arr_a - arr_b)))
    return 1.0 - mean_abs_diff / 255.0


def build_diff_image(arr_a: np.ndarray, arr_b: np.ndarray, score_map: np.ndarray) -> str:
    """
    Produce a visual diff image:
    - Identical pixels stay dark.
    - Changed pixels are highlighted using the app palette
      (blue → violet → pink by diff intensity).
    Returns a base64-encoded PNG string.
    """
    h, w = score_map.shape
    diff_intensity = 1.0 - score_map          # 0 = identical, 1 = maximum diff

    out = np.zeros((h, w, 3), dtype=np.uint8)

    # Background: dimmed blend of both images
    blend = (arr_a.astype(np.float32) * 0.35 + arr_b.astype(np.float32) * 0.35).astype(np.uint8)
    out[:] = blend

    # Palette colours (blue, violet, pink)
    palette = np.array([
        [96,  165, 250],   # --c-blue
        [167, 139, 250],   # --c-violet
        [244, 114, 182],   # --c-pink
    ], dtype=np.float32)

    intensity = diff_intensity[..., np.newaxis]          # (h, w, 1)

    # Low diff → blue, mid → violet, high → pink
    t = np.clip(intensity * 2, 0, 1)                     # 0..1 in first half  → blue→violet
    s = np.clip(intensity * 2 - 1, 0, 1)                 # 0..1 in second half → violet→pink
    color = (
        palette[0] * (1 - t)
        + palette[1] * t * (1 - s)
        + palette[2] * t * s
    )

    mask = diff_intensity > 0.05                         # only paint meaningful diffs
    out[mask] = np.clip(color[mask], 0, 255).astype(np.uint8)

    img = Image.fromarray(out, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/diff")
async def diff(
    image_a: UploadFile = File(...),
    image_b: UploadFile = File(...),
):
    """
    Compare two images using a blend of perceptual SSIM (structure) and
    colour fidelity, so that pure recolours are not under-reported.

    Returns:
      - score: float 0..1 — weighted blend of ssim and color_score (1 = identical)
      - ssim: float 0..1 — structural similarity alone
      - color_score: float 0..1 — colour fidelity alone
      - diff_image: base64-encoded PNG visualising the changed regions
      - width / height of the compared images
    """
    img_a = load_image(image_a)
    img_b = load_image(image_b)
    orig_a, orig_b = img_a.size, img_b.size
    img_a, img_b = normalize_pair(img_a, img_b)

    arr_a = np.asarray(img_a, dtype=np.float32)
    arr_b = np.asarray(img_b, dtype=np.float32)

    # SSIM's sliding window (default 7) must fit inside the image, otherwise
    # skimage raises ValueError. Shrink it for tiny images, keeping it odd.
    min_side = min(img_a.width, img_a.height)
    if min_side < 3:
        raise HTTPException(
            status_code=400,
            detail="Images must be at least 3x3 pixels to compare.",
        )
    win = min(7, min_side)
    if win % 2 == 0:
        win -= 1

    # Per-channel SSIM, then average; full=True returns the score map
    ssim_score, score_map = ssim(
        arr_a, arr_b,
        channel_axis=2,
        data_range=255.0,
        win_size=win,
        full=True,
    )
    # score_map shape is (h, w, 3) when channel_axis is used — average channels
    if score_map.ndim == 3:
        score_map = score_map.mean(axis=2)

    ssim_score = float(ssim_score)
    color_score = color_similarity(arr_a, arr_b)
    score = SSIM_WEIGHT * ssim_score + COLOR_WEIGHT * color_score

    diff_b64 = build_diff_image(arr_a.astype(np.uint8), arr_b.astype(np.uint8), score_map)

    return {
        "score": round(score, 6),
        "ssim": round(ssim_score, 6),
        "color_score": round(color_score, 6),
        # width/height describe the canvas actually compared (and the diff_image
        # size). original_a/original_b expose each input's true size so a
        # dimension change is never silently hidden by the normalisation.
        "width": img_a.width,
        "height": img_a.height,
        "original_a": {"width": orig_a[0], "height": orig_a[1]},
        "original_b": {"width": orig_b[0], "height": orig_b[1]},
        "resized": orig_a != orig_b,
        "diff_image": diff_b64,
    }