from flask import Flask, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import mss
import time
import threading

app = Flask(__name__)
CORS(app)

kill_loop = threading.Event()

def get_frame(sct, monitor):
    img = np.array(sct.grab(monitor))
    frame = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return frame

def average_brightness(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return np.mean(gray)

def detect_flashing(brightness_values, threshold=30, flash_count_trigger=3):
    flashes = 0
    for i in range(1, len(brightness_values)):
        if abs(brightness_values[i] - brightness_values[i - 1]) > threshold:
            flashes += 1
    return flashes >= flash_count_trigger

def screen_record_and_detect_flashes(duration=1, fps=10):
    sct = mss.mss()
    monitor = sct.monitors[1]
    interval = 1 / fps
    brightness_values = []
    start_time = time.time()

    while (time.time() - start_time) < duration:
        frame = get_frame(sct, monitor)
        brightness = average_brightness(frame)
        brightness_values.append(brightness)
        time.sleep(interval)

    if detect_flashing(brightness_values):
        return "Flashing lights detected"
    else:
        return "No flashing lights detected"

@app.route("/flashing", methods=["POST"])
def detect_flashes():
    kill_loop.clear()
    
    while not kill_loop.is_set():
        result = screen_record_and_detect_flashes()
        if result == "Detection Stopped":
            break
    return jsonify({"result": result})

@app.route("/end_loop", method=["POST"])
def stop_loop():
    kill_loop.set()
    return jsonify({"message": "Detection Stopped"})


if __name__ == "__main__":
    app.run(debug=True)