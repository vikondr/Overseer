import io
import base64
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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


def resize_to_match(img_a: Image.Image, img_b: Image.Image):
    """Resize img_b to match img_a dimensions if they differ."""
    if img_a.size != img_b.size:
        img_b = img_b.resize(img_a.size, Image.LANCZOS)
    return img_a, img_b


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
    Compare two images using perceptual SSIM (Structural Similarity Index).

    Returns:
      - score: float 0..1 (1 = identical, 0 = completely different)
      - diff_image: base64-encoded PNG visualising the changed regions
      - width / height of the compared images
    """
    img_a = load_image(image_a)
    img_b = load_image(image_b)
    img_a, img_b = resize_to_match(img_a, img_b)

    arr_a = np.asarray(img_a, dtype=np.float32)
    arr_b = np.asarray(img_b, dtype=np.float32)

    # Per-channel SSIM, then average; full=True returns the score map
    score, score_map = ssim(
        arr_a, arr_b,
        channel_axis=2,
        data_range=255.0,
        full=True,
    )
    # score_map shape is (h, w, 3) when channel_axis is used — average channels
    if score_map.ndim == 3:
        score_map = score_map.mean(axis=2)

    diff_b64 = build_diff_image(arr_a.astype(np.uint8), arr_b.astype(np.uint8), score_map)

    return {
        "score": round(float(score), 6),
        "width": img_a.width,
        "height": img_a.height,
        "diff_image": diff_b64,
    }