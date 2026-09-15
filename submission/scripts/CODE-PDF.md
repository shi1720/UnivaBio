# Looplight full-source PDF generator

This tool reads an explicit allowlist and never writes to the source checkout.
It produces a legible landscape-A4 code PDF without truncating long source lines,
an exact-byte SHA-256 inventory, and a byte-exact snapshot of the printed files.
Every printed source file is also embedded in the PDF as an attachment; those
attachment hashes are verified after writing the final PDF.

## Requirements

- Python 3.10 or newer
- `python -m pip install reportlab pypdf`
- Optional DejaVu Sans Mono font for broader Unicode coverage. Pass
  `--mono-font /path/to/DejaVuSansMono.ttf` if it is not found automatically.
  Without it, built-in Courier is used and unsupported characters are displayed
  as explicit Unicode code-point escapes. Original attachments remain exact.
- Optional Poppler `pdftoppm` and `pdftotext` for independent visual/text checks.

## Usage

Keep `source-allowlist.json` next to `generate_code_pdf.py`.

```sh
python generate_code_pdf.py --repo /path/to/UnivaBio --out /path/to/code-review --inventory-only
python generate_code_pdf.py --repo /path/to/UnivaBio --out /path/to/code-review
pdftoppm -r 110 -png /path/to/code-review/looplight-code.pdf /path/to/code-review/page
```

Outputs: `looplight-code.pdf`, `source-inventory.json`, `source-inventory.md`,
`source-inventory.sha256`, `pdf-verification.json`, and `source-snapshot/`.

The source allowlist includes application, library, API, database/migrations,
tests, training/inference/evaluation and data-generator scripts, build support,
artifact builders, selected project configs, favicon, and synthetic sample text.
Generated weights/datasets/evaluation JSON, lockfile, documentation, and artifact
assets are hash-listed rather than printed; their exact files live in the repo.
Foreign projects, dependency trees, untouched UI/vendor bundles, real environment
files, and temporary/runtime outputs are excluded.

Run final generation only after source freeze. If any included source changes
during the run, the tool reports it and exits with an error. A generated inventory
is evidence of specific bytes, not a claim of clinical validation or source originality.
