# Final narrated Looplight demo

## Ready files

- `looplight-narrated-demo.mp4`: 1920 x 1080, 30 fps, H.264 video and 48 kHz AAC narration. Duration 2:38.600.
- `captions.srt`: 32 captions timed from the actual final audio samples. Captions are also burned into the video.
- `looplight-thumbnail.png`: 1920 x 1080 thumbnail using a real app capture.
- `looplight-thumbnail.svg`: author-editable vector thumbnail with the full original screenshot embedded.
- `timeline.json`: scene and caption timings.
- `qa/contact-sheet-1.png`, `qa/contact-sheet-2.png`, `qa/contact-sheet-3.png`: all scene starts, middles, and endings.
- `qa/final-video-checks.json`: final encoding, loudness, captions, and visual review record.

## What was recorded

Eleven scenes use actual Chrome `Page.screencastFrame` captures from the hosted Firebase app. Each frame retains its original absolute metadata timestamp. The converter preserves timestamp differences, samples at 30 fps, and holds the last captured image through the reported capture duration. Playback is normal speed. No cursor, UI state, or interaction was synthesized. Scene 10 is explicitly an editorial pricing-hypothesis card.

Long static holds were trimmed to the narration-derived scene duration. The recorded confirmation, receipt, and reported-completion actions remain visible. The final scene uses a documented crop of the native result drawer to emphasize the exact source and reported history. No captured UI content was altered. Original capture manifests and frame hashes are retained in the capture conversion reports.

A fictional Anita/Maya example is shown. The voice is AI-generated narration, not Shivam Gupta's voice. Both disclosures remain visible throughout. The prototype, evaluation, pricing, and clinical limitations are stated without claiming validation or proven health benefit.

## Verification

The complete video and audio streams decoded successfully: all 4,758 expected frames at 30 fps. All 32 captions are ordered, non-overlapping, and within the audio-derived timeline. The revised calendar cue says “Calendar entries use confirmed dates.”

33 samples of the converted source clips were compared with their original captured JPEG states, allowing one 30 fps interval. All passed, with a minimum PSNR of 44.74 dB. This independently checks that capture timing was preserved within normal frame-rate sampling precision.

All 36 start, middle, and end frames were visually inspected, along with selected full-resolution scenes and the thumbnail. No blank scene, caption clipping, or disclosure overlap was observed in these frames. Source text, human confirmation, result receipt, reported clinician review, and the final history are visible. Captions follow the measured speech timing; the interaction actions are real but were not artificially retimed to individual spoken words.

The encoded mix measured -16.5 LUFS integrated loudness and -1.3 dBTP. This remains below full scale; AAC encoding produced 0.2 dB of overshoot above the normalization target. The 32 source narration files passed metadata/hash checks and had no hard-clipped PCM samples. Local speech recognition recovered the script, with one equivalent numeric-format difference. Direct listening was unavailable to the assembling agent, so subjective listening review is not claimed.

## Rebuild

Use the bundled Python runtime, Noto Sans regular/bold font directory, and an explicit FFmpeg executable.

1. Run `submission/scripts/convert-cdp-capture.py --root outputs/demo-final --ffmpeg <path>`.
2. Run `submission/scripts/assemble_demo.py --root outputs/demo-final --ffmpeg <path> --font-dir <font-directory>`.
3. Run `outputs/demo-final/verify_final_video.py --ffmpeg <path> --font-dir <font-directory>` and inspect the regenerated frames.
4. Run `outputs/demo-final/check_capture_timing.py --ffmpeg <path>`.
5. Run `outputs/demo-final/build-thumbnail.py --font-dir <font-directory>`.

The working scene manifest must retain the real capture paths, final audio, and documented scene-12 crop. Recalculate timing whenever audio changes. Source WAVs total 151.40 seconds; the final 158.60-second runtime includes cue gaps, scene leads/tails, and frame-aligned padding.

A rebuild invalidates the recorded visual-inspection claim until the new frames are reviewed. Refresh the delivery manifest only after that review. The video demonstrates the captured app release; later UI changes can differ from these recorded visuals.

## Packaged reproducibility helpers

The final helper sources are preserved in `submission/video/builders/`. Run commands from the repository root and pass `--root` explicitly.

The compact submission video directory includes every converted scene MP4 and narration WAV referenced by its scene plan. To rebuild the narrated video from these inputs, run `submission/scripts/assemble_demo.py --root submission/video --ffmpeg <path> --font-dir <font-directory>`. It writes a fresh render under `submission/video/output/`; the submitted final MP4 remains at the package root.

For complete original-capture regeneration and timing comparisons, use the retained `outputs/demo-final/captures/raw-XX/frames.json` manifests and their JPEGs. Those raw-frame inputs are not duplicated in the compact submission directory. The conversion reports retain their hashes.

- `submission/video/builders/build-thumbnail.py --root outputs/demo-final --font-dir <font-directory>` rebuilds the thumbnail from the original recorded result panel. The editable SVG in this package also embeds its entire source image.
- `submission/video/builders/check_capture_timing.py --root outputs/demo-final --ffmpeg <path>` compares converted clips to their original timestamped JPEGs.
- `submission/video/builders/verify_final_video.py --root outputs/demo-final --ffmpeg <path> --font-dir <font-directory>` checks the final render and extracts review frames. To check a newly rebuilt compact-package render, use `--root submission/video` instead.

These scripts match the final source used for the delivered video. Their default root refers to the script directory, so the explicit root argument is required at this packaged location. Runtime dependencies are standard Python plus Pillow/NumPy and FFmpeg; no credentials or narration API key are read. Rebuilding requires fresh visual review and manifest updates.
