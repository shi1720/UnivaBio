#!/usr/bin/env python3
"""Generate disclosed AI narration. Credentials stay outside the project."""
import argparse
import concurrent.futures
import hashlib
import io
import wave
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("manifest", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--key-file", type=Path)
parser.add_argument("--voice", default="cedar")
args = parser.parse_args()
key = args.key_file.read_text().strip() if args.key_file else os.environ.get("OPENAI_API_KEY", "")
if not key:
    raise SystemExit("Provide OPENAI_API_KEY or a private --key-file outside the repository.")
manifest = json.loads(args.manifest.read_text())
args.output.mkdir(parents=True, exist_ok=True)

def generate(item):
    output = args.output / item["output_path"]
    fingerprint = hashlib.sha256((item["text"] + args.voice + manifest["voice_direction"]).encode()).hexdigest()
    meta = output.with_suffix(".json")
    if output.exists() and meta.exists() and json.loads(meta.read_text()).get("fingerprint") == fingerprint:
        return {"id": item["id"], "cached": True}
    payload = json.dumps({"model": "gpt-4o-mini-tts", "voice": args.voice,
        "input": item["text"], "instructions": manifest["voice_direction"], "response_format": "wav"}).encode()
    request = urllib.request.Request("https://api.openai.com/v1/audio/speech", payload,
        {"Authorization": "Bearer " + key, "Content-Type": "application/json"}, method="POST")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                data = response.read()
            if not data.startswith(b"RIFF") or len(data) < 1000:
                raise RuntimeError("Speech service returned an invalid WAV file.")
            # Streaming WAV responses may use an unknown-length RIFF header.
            # Decode the available PCM and write a standard finite WAV header.
            with wave.open(io.BytesIO(data), "rb") as source:
                params = source.getparams()
                frames = source.readframes(source.getnframes())
            normalized = io.BytesIO()
            with wave.open(normalized, "wb") as target:
                target.setparams(params._replace(nframes=0))
                target.writeframes(frames)
            data = normalized.getvalue()
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(data)
            info = {"id": item["id"], "model": "gpt-4o-mini-tts", "voice": args.voice,
                "text": item["text"], "fingerprint": fingerprint, "sha256": hashlib.sha256(data).hexdigest(),
                "disclosure": "AI-generated narration. Not Shivam Gupta's voice."}
            meta.write_text(json.dumps(info, indent=2) + "\n")
            return {"id": item["id"], "bytes": len(data)}
        except urllib.error.HTTPError as error:
            if error.code not in [429, 500, 502, 503, 504] or attempt == 2:
                raise RuntimeError(f"Speech API returned HTTP {error.code}. No credential or response body was logged.") from None
            time.sleep(2 ** (attempt + 1))

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(generate, manifest["requests"]):
        print(json.dumps(result), flush=True)
