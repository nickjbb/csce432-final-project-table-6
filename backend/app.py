"""
Improved flash detector: looks at overall luminance swings
and requires multiple hits in a short window (to avoid noise).
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2, base64, re, numpy as np
from collections import deque
import time

app = Flask(__name__)
CORS(app)
PORT = 6969

LUM_DIFF_THRESH = 30          # average‑brightness jump (0‑255)
WINDOW_SEC      = 1.0         # look‑back window length
HITS_REQUIRED   = 3           # flashes needed in that window

prev_lum: float | None = None
hits = deque()

def decode_gray(uri: str) -> np.ndarray:
    img_b64 = re.sub(r"^data:image/[^;]+;base64,", "", uri)
    buf     = np.frombuffer(base64.b64decode(img_b64), np.uint8)
    img     = cv2.imdecode(buf, cv2.IMREAD_GRAYSCALE)
    return img

@app.route("/analyze", methods=["POST"])
def analyze():
    global prev_lum
    data = request.get_json(force=True)
    if "frame" not in data:
        return jsonify(error="no frame"), 400

    gray = decode_gray(data["frame"])
    lum  = float(np.mean(gray))

    flash_now = False
    if prev_lum is not None and abs(lum - prev_lum) >= LUM_DIFF_THRESH:
        flash_now = True
    prev_lum = lum

    now = time.time()
    hits.append((now, flash_now))
    while hits and now - hits[0][0] > WINDOW_SEC:
        hits.popleft()

    flash_count = sum(1 for t, f in hits if f)
    alarm = flash_count >= HITS_REQUIRED
    return jsonify(flash=alarm)

@app.route("/ping")
def ping(): return "pong"

if __name__ == "__main__":
    app.run("127.0.0.1", PORT, debug=True)
