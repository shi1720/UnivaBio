# Full-source PDF verification

Final PDF: `looplight-code.pdf`  
SHA-256: `8a04f0bb66a9ce16cdd599e4cffd86f0a501de39a3c0e2690483291aeec7e005`

- 400 A4 landscape pages; 95 complete source files; 14,101 original source lines and 14,711 wrapped display rows.
- 64 supporting/generated files are hash-listed. Exact weights, datasets and assets remain in the repository.
- Every printed source file is embedded in the PDF as an original-byte attachment. All 95 attachment hashes verified against the source inventory.
- Filename index and PDF bookmarks navigate to each source file. Long lines wrap; continuation markers and documented Unicode display escapes preserve readable coverage. Exact bytes remain in attachments and `source-snapshot/`.
- Every final page rendered successfully with Poppler at 70 dpi. All page layouts were inspected through 20 contact sheets. Cover, index, engine, evaluator, trainer and appendix were inspected at 130 dpi.
- A cover-rule collision was corrected. All 12 changed page rasters were inspected again; 388 page rasters matched the previously inspected version byte for byte.
- Independent pdfplumber inspection found zero out-of-page characters across 664,508 characters and 400 pages. Ordinary Poppler text extraction succeeded. The optional Poppler bbox-layout mode crashed; pdfplumber supplied the independent character-bound check instead.
- All 159 included repository files still matched their SHA-256 values after final rendering. No repository source was changed by the generator.

Portable generation source: `submission/scripts/generate_code_pdf.py`, with `source-allowlist.json` beside it. Requires Python 3.10+, ReportLab and pypdf; optional DejaVu Sans Mono font. Output must be outside the source checkout.

The inventory identifies submitted source, including adapted/inherited helpers; it does not claim every included line was authored from scratch. Dependency and third-party notices remain in the repository.
