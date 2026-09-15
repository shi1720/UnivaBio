# Looplight full-source PDF generator

This tool reads an explicit allowlist and never writes to the source checkout.
It produces a legible landscape-A4 code PDF without truncating long source lines,
an exact-byte SHA-256 inventory, and a byte-exact snapshot of the printed files.
Every selected source and support file is also embedded in the PDF as an
attachment and included in `looplight-source.zip`. Attachment and ZIP hashes
are verified after writing. A reader does not need access to the private
repository to obtain any allowlisted file.

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
`source-inventory.sha256`, `pdf-verification.json`, `looplight-source.zip`, and
`source-snapshot/`. The snapshot and ZIP include printed and hash-listed files;
the ZIP also includes the generated manifests and a short setup note.

The source allowlist includes the current Firebase entry point, Auth/Firestore
adapter, rules, public browser configuration, deployment configuration and
emulator tests. It also includes application libraries such as `history.ts`,
snapshot validation and in-memory drafts, retained historical API/database
source, training/inference/evaluation and data-generator scripts, build support,
artifact builders including nested deck/PDF scripts and `submission/video/builders`,
selected project configs, favicon, and synthetic sample text. Nested builder
images, content/verification JSON, prose and requirements are hash-listed;
large rendered videos are not included in this source inventory.
`required_printed_files` makes inventory generation fail if a critical Firebase
release file is absent or excluded. The browser config identifies the public
Firebase project; it does not contain a service-account key.
Generated weights/datasets/evaluation JSON, lockfile, documentation, and artifact
assets are hash-listed rather than printed; their exact files are attached and
included in the source snapshot/ZIP.
Sanitized, retained Firebase reports are hash-listed. Transient live/emulator
result files and runtime logs are not selected by the allowlist.
Inherited UI/hook scaffold, the historical Vite plugin and its license, and
vendored CSS/license are included for a complete build. The scaffold and CSS are
hash-listed exact attachments rather than printed pages. Foreign projects,
dependency trees, real environment files and temporary/runtime outputs are excluded.

Run final generation only after source freeze. The inventory timestamp records when source bytes were captured; it is not a
commit time or a claim about when a feature was implemented. ZIP member times
are fixed for reproducibility from the same inventory. If any included source changes
during the run, the tool reports it and exits with an error. A generated inventory
is evidence of specific bytes, not a claim of clinical validation or source originality.
