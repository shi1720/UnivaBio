# Add your voice to the Looplight walkthrough

The silent video uses actual app screenshots and clearly labels itself **Screenshot walkthrough**. All records are fictional. It contains the full verbatim narration as on-screen captions and a matching SRT subtitle file.

## Record

1. Import `looplight-screenshot-walkthrough.mp4` into a video editor.
2. Use headphones. Record your own voice while reading the **Verbatim voiceover** section of `demo-script.md` exactly. Follow the on-screen captions, leaving the short gaps between sections.
3. If one take feels rushed, record a paragraph at a time and align it to the chapter timings in `walkthrough-timeline.json`.
4. Keep the screenshot-walkthrough and fictional-data labels visible. The captured states do not show live clicks or prove an interaction occurred on camera.
5. Export as 1920 × 1080, 30 fps, H.264 MP4 with your narration. The supplied video already has visible captions. The `.srt` is available for editing or accessible hosted captions, so avoid adding a second burned-in caption layer.

The silent walkthrough runs **3 minutes 9.97 seconds**. The narration contains **419 words**. No synthetic voice or background music appears.

## Strengthen the hackathon demo

The hackathon asks to demonstrate user interactions. Capture a short actual click-through of **Find the open loops**, **Confirm this follow-up**, and the separate **Record result received** / **Record completion** steps. You can replace the corresponding still-image sections with those clips while keeping the narration. Leave the screenshot label on sections that remain still images.

Then upload the narrated demo to a judge-viewable supported host and test signed-out playback. The silent walkthrough itself has not been uploaded or submitted.

## Files

- `looplight-screenshot-walkthrough.mp4`: silent narrated-demo visual track, with visible captions.
- `looplight-walkthrough.srt`: exact matching timed narration text.
- `walkthrough-timeline.json`: chapter timings and paragraphs.
- `walkthrough-verification.json`: dimensions, duration, source hashes, and decode checks.
- `scripts/build-walkthrough.py`: portable video builder.
- `assets/walkthrough-storyboard.json`: editable scene sequence.

## Rebuild

Use Python 3 and FFmpeg with `libx264`, `drawtext`, and `libass`. Pass the binary with `--ffmpeg` or `FFMPEG_BIN`. An isolated `imageio-ffmpeg` installation also works. Set `LOOPLIGHT_FONT_DIR` to a folder containing `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf`.

Run `scripts/build-walkthrough.py` from any directory. It derives the package root from its location. `--root` overrides that root. `--prepare-only` regenerates timings/subtitles without rendering. `--scene-preview N` renders only the selected scene for inspection.

The builder preserves original screenshot files. The storyboard permits crops only for documented blank edges or exact native dialog boundaries and otherwise letterboxes images. The build owner authorized the dialog-boundary crops for readability. It uses explicit file arguments without shell interpolation. Source hashes make the inputs auditable. Follow the [FFmpeg filter documentation](https://ffmpeg.org/ffmpeg-filters.html) when changing video filters.
