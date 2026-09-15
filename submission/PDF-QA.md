# Full-source PDF and ZIP verification

Final PDF: `looplight-code.pdf`
SHA-256: `0003aa1b53afb53c7840d1756e29fa3da1fc990ae326add1f572a7babdf36e8b`
Final source ZIP: `looplight-source.zip`
SHA-256: `457a1c8802b19eae430aaa87fadbe6a4d064d87c6244ab7949f49d2fddb677ca`

- **535 A4 landscape pages**, with 129 complete printed source files, 18,654 original source lines and 19,360 wrapped display rows.
- **149 support files** are hash-listed rather than printed. They include model weights, synthetic datasets, evaluation evidence, the lockfile, inherited UI/hooks, required vendor CSS/licenses, documentation and builder images.
- Every one of the **278 selected repository files** is attached to the PDF with original bytes and included in the source ZIP. All attachment and ZIP hashes verified. The ZIP has 282 entries including generated inventories and a setup note. Private repository access is not needed to obtain these selected files.
- Filename index and PDF bookmarks navigate the printed source. Long lines wrap and display continuation markers. Unsupported font characters use documented Unicode escapes; attachments preserve exact bytes.
- Every final page rendered with Poppler at 70 dpi. The preceding 523-page render was inspected through 22 contact sheets. In the final revision, 504 source-page bodies matched that inspected render byte for byte at the pixel level; all 31 new or changed source/index/appendix pages were inspected again.
- Ten representative final pages were inspected at 130 dpi, covering the cover, filename index, historical build helper, Firestore rules, PDF loader, pipeline evaluator, allowlist, repaired API test harness and support appendix. No clipped content, overlapping text, missing glyph blocks or broken page chrome was observed.
- Independent pdfplumber checks found **zero out-of-page characters** across **888,472 characters**, zero blank pages and zero attachment mismatches on all 535 final pages.
- All 278 source hashes still matched after rendering. The generator did not change repository source.

## Archive completeness checks

The first public-source archive omitted a historical Vite helper and required vendored CSS. The allowlist was corrected before final delivery, with upstream licenses and inherited UI/hook scaffold included as exact attachments. The release owner extracted the corrected archive and passed TypeScript checking, the production build and all 16 snapshot/export tests using the existing locked dependency installation through a symlink. This was an isolated source build, not a fresh dependency install.

The release owner also reported all three jobs passing in remote CI run `35004236628` at `cb7e07c`: normal verification/build, Firebase Auth/Firestore emulators and the historical D1 API suite. That workflow installs dependencies freshly. Its historical API harness was repaired to use the checked-in local Wrangler configuration. Historical D1 checks remain separate from Firebase evidence.

The final revision additionally includes the README screenshots. Final ZIP bytes and the independently rebuilt application-asset comparison are recorded by the release owner before deployment.

## Reproduction and scope

Portable builder: `submission/scripts/generate_code_pdf.py`, with `source-allowlist.json` beside it. Requires Python 3.10+, ReportLab and pypdf; optional DejaVu Sans Mono font. Generation output must be outside the source checkout. The timestamp `2026-09-15T17:57:32+00:00` identifies captured source bytes, not a commit time or a claim about when implementation occurred.

The explicit allowlist excludes dependency trees, real environment files, credentials, foreign projects, runtime state and large video outputs. Video builder code and reconstruction instructions are included; original capture/media inputs are delivered separately and are not all inside the source ZIP. The inventory identifies project source, including adapted/inherited helpers. It does not claim every included line was authored from scratch or establish clinical validation.
