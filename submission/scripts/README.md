# Rebuild the submission artifacts

The reviewed deliverables are published at the `submission/` root. Builders write fresh candidates into `submission/output/`; render and inspect them before promoting copies to the stable filenames.

These builders are portable. Copy `scripts/`, `assets/`, and `output/` together to a submission package directory. No builder contains a personal home-directory or `/tmp` path.

The one-page PDF uses ReportLab and Noto Sans. The editable deck uses `@oai/artifact-tool` and the installed Presentations skill's finalizer. Use the bundled runtime locations returned by `load_workspace_dependencies`.

## Required environment

Set these to the absolute paths returned by the runtime or installed skill:

| Variable | Value |
|---|---|
| `RUNTIME_NODE_MODULES` | Bundled Node packages directory |
| `RUNTIME_PYTHON` | Bundled Python executable |
| `PRESENTATIONS_SKILL_DIR` | Installed Presentations skill directory |
| `LOOPLIGHT_FONT_DIR` | Directory containing `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` |

Optional values:

- `LOOPLIGHT_SUBMISSION_DIR`: output/package root for the deck. Default: parent of `scripts/`.
- `LOOPLIGHT_SCREENSHOT`: screenshot PNG path. Default: `assets/product.png` under the package root.
- `PRESENTATION_FONT`: deck font family. Default: `Noto Sans`.

Run `build-deck.mjs` with the bundled Node executable and a new revision name, for example `release-1`. The finalizer refuses to overwrite an existing checked output.

Run `build-onepager.py` with the bundled Python executable. Its optional `--root` argument overrides the package root. Output is `output/looplight-one-page.pdf`.

## Screenshot handling

`assets/product.png` is an unchanged capture of the actual care board with fictional Anita/Maya data. The native image crop on slide 3 removes blank right/bottom page space. It does not redraw, alter, or replace any application content.

`apply-native-crop.py` repairs the runtime's exported image crop, which otherwise resets to an automatic centered crop. It changes only the native OOXML crop and frame. The original PNG bytes stay embedded, and the crop remains editable in PowerPoint. Update its crop geometry if replacing the source capture with different dimensions.

## Final verification

The deck builder runs structural/layout/font checks and first-party import validation. These checks do not establish visual quality.

Render the final PPTX using the **bundled** LibreOffice executable returned through the runtime. Never use the user's installed desktop LibreOffice. Convert the deck to PDF, then render all pages with bundled `pdftoppm`. Inspect every slide, including the screenshot crop. Retain private validation receipts and rendered QA outside `output/`.

Rebuild the one-page PDF, confirm that it contains exactly one page, and inspect its full rendered page. Use a final copy with a stable filename only after this review.

## Content updates

If model metrics or product behavior change, update both builders and all three Markdown deliverables together. Keep raw accuracy distinct from abstention behavior, and keep synthetic evidence distinct from clinical validation. The app saves extracted source text rather than original uploaded PDF bytes.

## Silent screenshot walkthrough

`build-walkthrough.py` uses the original app captures in `assets/walkthrough/` and the scene sequence in `assets/walkthrough-storyboard.json`. It reads the verbatim narration directly from `output/demo-script.md` and verifies that the storyboard covers it exactly once. See `output/walkthrough-recording-guide.md` for FFmpeg/font inputs and recording instructions.
