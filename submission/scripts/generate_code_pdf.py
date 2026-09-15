#!/usr/bin/env python3
"""Portable, full-source PDF + SHA-256 manifest generator for Looplight.

Requires Python 3.10+, reportlab, and pypdf. Never modifies the repository.
Example:
  python generate_code_pdf.py --repo /path/to/UnivaBio --out /path/to/output
Use --inventory-only to inspect the allowlist without creating the final PDF.
Long source lines wrap; line numbers repeat only on their first rendered row.
Every selected file, including hash-listed support data, is attached, copied to a source snapshot, and included in a verified source ZIP.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

PAGE_W, PAGE_H = landscape(A4)
LEFT, RIGHT, TOP, BOTTOM = 34.0, 34.0, 55.0, 36.0
CODE_SIZE, LEADING, GUTTER = 8.7, 11.3, 41.0
INK = colors.HexColor('#15253b')
BLUE = colors.HexColor('#315bdb')
MUTED = colors.HexColor('#66788e')
RULE = colors.HexColor('#dce4ed')
NAVY = colors.HexColor('#102238')
LIME = colors.HexColor('#c7f578')
ROWS_PER_PAGE = int((PAGE_H - TOP - BOTTOM) // LEADING)
INDEX_ROWS = 30
HASH_ROWS = 11


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def is_allowed(path: Path, repo: Path, policy: dict[str, Any]) -> bool:
    rel = path.relative_to(repo)
    if not path.is_file() or path.is_symlink():
        return False
    if any(part in policy['excluded_path_parts'] for part in rel.parts):
        return False
    if any(rel.parts[0].startswith(prefix) for prefix in policy['excluded_root_prefixes']):
        return False
    return True


def discover(repo: Path, policy: dict[str, Any]) -> tuple[list[Path], list[Path]]:
    printed: set[Path] = set()
    referenced: set[Path] = set()
    for name in policy['printed_exact_files']:
        p = repo / name
        if p.exists() and is_allowed(p, repo, policy):
            printed.add(p)
    extensions = set(policy['printed_source_extensions'])
    for name in policy['printed_source_directories']:
        base = repo / name
        if base.is_dir():
            printed.update(p for p in base.rglob('*')
                           if p.suffix in extensions and is_allowed(p, repo, policy))
    for pattern in policy['printed_globs']:
        printed.update(p for p in repo.glob(pattern) if is_allowed(p, repo, policy))
    for pattern in policy['hash_only_globs']:
        referenced.update(p for p in repo.glob(pattern) if is_allowed(p, repo, policy))
    order = lambda p: p.relative_to(repo).as_posix()
    return sorted(printed, key=order), sorted(referenced - printed, key=order)


def load_sources(repo: Path, printed: list[Path], referenced: list[Path]) -> tuple[list[dict[str, Any]], dict[str, bytes]]:
    entries: list[dict[str, Any]] = []
    data: dict[str, bytes] = {}
    for mode, paths in [('full_source', printed), ('hash_only', referenced)]:
        for path in paths:
            rel = path.relative_to(repo).as_posix()
            raw = path.read_bytes()
            item: dict[str, Any] = {'path': rel, 'bytes': len(raw), 'sha256': sha256(raw), 'representation': mode}
            if mode == 'full_source':
                text = raw.decode('utf-8')
                item['source_lines'] = len(text.splitlines()) or 1
                item['ends_with_newline'] = text.endswith('\n')
                item['line_endings'] = 'CRLF' if b'\r\n' in raw else 'LF'
            entries.append(item)
            data[rel] = raw
    return entries, data


def find_font(explicit: str | None, filename: str) -> Path | None:
    if explicit:
        p = Path(explicit).expanduser()
        if not p.is_file():
            raise SystemExit(f'Font not found: {p}')
        return p
    candidates = [
        Path(__file__).parent / 'fonts' / filename,
        Path('/usr/share/fonts/truetype/dejavu') / filename,
        Path('/usr/local/share/fonts') / filename,
        Path.home() / '.fonts' / filename,
    ]
    runtime = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/native'
    if runtime.is_dir():
        candidates.extend(runtime.rglob(filename))
    for p in candidates:
        if p.is_file():
            return p
    return None


def configure_fonts(args: argparse.Namespace) -> tuple[str, set[int] | None]:
    mono = find_font(args.mono_font, 'DejaVuSansMono.ttf')
    if mono:
        pdfmetrics.registerFont(TTFont('SourceMono', str(mono)))
        return 'SourceMono', set(pdfmetrics.getFont('SourceMono').face.charToGlyph)
    # Built-in Courier is available on every ReportLab installation. Escaping
    # non-ASCII guarantees complete readable content even without optional fonts.
    return 'Courier', set(range(32, 127))


def visible_line(line: str, supported: set[int] | None, escapes: Counter[str]) -> str:
    result: list[str] = []
    for ch in line.expandtabs(4):
        cp = ord(ch)
        if (cp < 32 or cp == 127 or (supported is not None and cp not in supported)):
            rendered = f'\\u{{{cp:04X}}}'
            escapes[rendered] += 1
            result.append(rendered)
        else:
            result.append(ch)
    return ''.join(result)


def wrap_code(line: str, font: str, width: float) -> list[str]:
    if not line:
        return ['']
    result: list[str] = []
    start = 0
    while start < len(line):
        used = 0.0
        end = start
        while end < len(line):
            char_width = pdfmetrics.stringWidth(line[end], font, CODE_SIZE)
            if used + char_width > width and end > start:
                break
            used += char_width
            end += 1
        result.append(line[start:end])
        start = end
    assert ''.join(result) == line, 'A wrapped line lost source characters.'
    return result


def prepare_rows(entries: list[dict[str, Any]], data: dict[str, bytes], font: str,
                 supported: set[int] | None) -> tuple[dict[str, list[tuple[str, str]]], Counter[str]]:
    all_rows: dict[str, list[tuple[str, str]]] = {}
    escapes: Counter[str] = Counter()
    width = PAGE_W - LEFT - RIGHT - GUTTER
    for entry in entries:
        if entry['representation'] != 'full_source':
            continue
        rows: list[tuple[str, str]] = []
        original_lines = data[entry['path']].decode('utf-8').splitlines() or ['']
        for number, line in enumerate(original_lines, 1):
            visible = visible_line(line, supported, escapes)
            for continuation, part in enumerate(wrap_code(visible, font, width)):
                rows.append((str(number) if continuation == 0 else '>', part))
        entry['rendered_rows'] = len(rows)
        entry['pdf_pages'] = max(1, math.ceil(len(rows) / ROWS_PER_PAGE))
        all_rows[entry['path']] = rows
    return all_rows, escapes


def write_manifests(out: Path, manifest: dict[str, Any], data: dict[str, bytes]) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / 'source-inventory.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (out / 'source-inventory.sha256').write_text(''.join(f"{e['sha256']}  {e['path']}\n" for e in manifest['files']), encoding='utf-8')
    lines = ['# Looplight source inventory', '', f"Generated: {manifest['generated_at']}", '',
             'SHA-256 values cover exact repository bytes. Every listed file is embedded in the PDF as a lossless attachment and included in the source ZIP. '
             'Generated model weights, datasets, evaluation JSON, lockfile, supporting prose, and binary assets are hash-listed rather than printed; '
             'their exact bytes are supplied with the printed source.', '', manifest['authorship_note'], '',
             '| Repository file | Representation | Bytes | SHA-256 | PDF pages |',
             '|---|---|---:|---|---|']
    for e in manifest['files']:
        pages = f"{e['pdf_start_page']}-{e['pdf_end_page']}" if 'pdf_start_page' in e else '-'
        lines.append(f"| `{e['path']}` | {e['representation']} | {e['bytes']} | `{e['sha256']}` | {pages} |")
    lines += ['', '## Exclusions', '', manifest['exclusion_note'], '']
    (out / 'source-inventory.md').write_text('\n'.join(lines), encoding='utf-8')
    snapshot = out / 'source-snapshot'
    for e in manifest['files']:
        p = snapshot / e['path']
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data[e['path']])


def paragraph(c: canvas.Canvas, text: str, x: float, y: float, width: float,
              size: float = 11, leading: float = 16, color: colors.Color = INK) -> float:
    words = text.split()
    lines: list[str] = []
    line = ''
    for word in words:
        candidate = f'{line} {word}'.strip()
        if pdfmetrics.stringWidth(candidate, 'Helvetica', size) > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    c.setFillColor(color)
    c.setFont('Helvetica', size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def page_chrome(c: canvas.Canvas, title: str, page: int, total: int, detail: str = '') -> None:
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(LEFT, PAGE_H - 25, title)
    c.setFont('Helvetica', 8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - RIGHT, PAGE_H - 25, detail)
    c.setStrokeColor(RULE)
    if title or detail: c.line(LEFT, PAGE_H - 36, PAGE_W - RIGHT, PAGE_H - 36)
    c.line(LEFT, 27, PAGE_W - RIGHT, 27)
    c.setFont('Helvetica', 8)
    c.drawString(LEFT, 15, 'Looplight | Shivam Gupta | Source review edition')
    c.drawRightString(PAGE_W - RIGHT, 15, f'{page} / {total}')


def create_pdf(out: Path, manifest: dict[str, Any], rows: dict[str, list[tuple[str, str]]],
               data: dict[str, bytes], font: str, policy_bytes: bytes) -> dict[str, Any]:
    printed = [e for e in manifest['files'] if e['representation'] == 'full_source']
    referenced = [e for e in manifest['files'] if e['representation'] == 'hash_only']
    index_pages = math.ceil(len(printed) / INDEX_ROWS)
    hash_pages = math.ceil(len(referenced) / HASH_ROWS)
    total = 1 + index_pages + sum(e['pdf_pages'] for e in printed) + hash_pages
    next_page = 2 + index_pages
    for e in printed:
        e['pdf_start_page'] = next_page
        e['pdf_end_page'] = next_page + e['pdf_pages'] - 1
        next_page += e['pdf_pages']
    manifest['pdf'] = {'filename': 'looplight-code.pdf', 'pages': total, 'page_size': 'A4 landscape',
                       'code_font': font, 'code_font_size_pt': CODE_SIZE,
                       'line_number_convention': 'Original source line; > marks a wrapped continuation.',
                       'source_attachment_count': len(printed),
                       'supporting_attachment_count': len(referenced),
                       'all_inventory_files_attached': True}
    write_manifests(out, manifest, data)
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle('Looplight - Complete project source')
    c.setAuthor('Shivam Gupta')
    c.setSubject('Full first-party project source, source hashes, and generated-data inventory')
    page = 1
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 208, PAGE_W, 208, fill=1, stroke=0)
    c.setFillColor(LIME)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(LEFT + 8, PAGE_H - 45, 'LOOPLIGHT / UNIVABIO 2026')
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 33)
    c.drawString(LEFT + 8, PAGE_H - 102, 'Complete project source')
    c.setFont('Helvetica', 14)
    c.drawString(LEFT + 8, PAGE_H - 137, 'Shivam Gupta | Developed with AI assistance')
    c.setFont('Helvetica', 11)
    c.drawString(LEFT + 8, PAGE_H - 170, 'Full source, exact-byte SHA-256 inventory, and lossless source attachments.')
    y = PAGE_H - 247
    summary = (f"{len(printed)} printed source files; {sum(e['source_lines'] for e in printed):,} source lines; "
               f"{len(referenced)} supporting/generated files hash-listed. Snapshot: {manifest['generated_at']}.")
    y = paragraph(c, summary, LEFT + 8, y, PAGE_W - LEFT - RIGHT - 16, 12, 18) - 14
    cover_notes = [
        'Read the filename index first. All original source lines are present: long lines wrap, and a > in the gutter marks continuation. Tabs are displayed as four spaces. Original bytes remain in embedded source attachments and the accompanying source snapshot.',
        'Characters unavailable in the embedded font are displayed as Unicode code-point escapes. This is a display convention only; attached source and SHA-256 hashes retain the exact original bytes.',
        manifest['authorship_note'],
        'Model weights, datasets, evaluation JSON, dependency lockfile, supporting prose, and binary assets are hash-listed in the appendix and attached as exact files. The companion source ZIP contains the same inventory. No repository access is needed to obtain these included files.',
        'Repository: https://github.com/shi1720/UnivaBio'
    ]
    for note in cover_notes:
        y = paragraph(c, note, LEFT + 8, y, PAGE_W - LEFT - RIGHT - 16, 10, 15) - 12
    page_chrome(c, '', page, total, '')
    c.showPage()
    page += 1
    for group in range(index_pages):
        page_chrome(c, 'Filename index', page, total, 'Full source follows; full hashes in source-inventory.json')
        y = PAGE_H - 60
        c.setFont('Helvetica-Bold', 9)
        for label, x in [('Repository path', LEFT), ('Lines', PAGE_W - 232), ('SHA-256 prefix', PAGE_W - 183), ('PDF page(s)', PAGE_W - 95)]:
            c.drawString(x, y, label)
        y -= 19
        for e in printed[group * INDEX_ROWS:(group + 1) * INDEX_ROWS]:
            c.setFillColor(INK)
            c.setFont('Helvetica', 9)
            c.drawString(LEFT, y, e['path'])
            c.setFont('Helvetica', 8)
            c.drawString(PAGE_W - 232, y, str(e['source_lines']))
            c.drawString(PAGE_W - 183, y, e['sha256'][:12])
            c.drawString(PAGE_W - 95, y, str(e['pdf_start_page']) if e['pdf_pages'] == 1 else f"{e['pdf_start_page']}-{e['pdf_end_page']}")
            c.linkRect('', f"source-{e['path']}", (LEFT, y-3, PAGE_W-RIGHT, y+10), relative=0, thickness=0)
            y -= 15
        c.showPage()
        page += 1
    source_page_checks: list[dict[str, Any]] = []
    for e in printed:
        filename = e['path']
        file_rows = rows[filename]
        for chunk in range(e['pdf_pages']):
            if chunk == 0:
                c.bookmarkPage(f'source-{filename}')
                c.addOutlineEntry(filename, f'source-{filename}', 0, False)
            page_chrome(c, filename, page, total, f"{e['bytes']:,} bytes | SHA-256 {e['sha256'][:16]}... | part {chunk+1}/{e['pdf_pages']}")
            y = PAGE_H - TOP
            drawn = 0
            for number, content in file_rows[chunk * ROWS_PER_PAGE:(chunk + 1) * ROWS_PER_PAGE]:
                c.setFont('Helvetica', 7)
                c.setFillColor(MUTED)
                c.drawRightString(LEFT + GUTTER - 9, y, number)
                c.setFont(font, CODE_SIZE)
                c.setFillColor(INK)
                c.drawString(LEFT + GUTTER, y, content)
                assert pdfmetrics.stringWidth(content, font, CODE_SIZE) <= PAGE_W - LEFT - RIGHT - GUTTER + 0.01
                drawn += 1
                y -= LEADING
            assert y + LEADING >= BOTTOM - 0.01
            source_page_checks.append({'page': page, 'path': filename, 'drawn_rows': drawn})
            c.showPage()
            page += 1
    for group in range(hash_pages):
        page_chrome(c, 'Supporting and generated file inventory', page, total, 'Hash-only appendix | Exact files attached and in source ZIP')
        y = PAGE_H - 57
        for e in referenced[group * HASH_ROWS:(group + 1) * HASH_ROWS]:
            c.setFillColor(INK)
            c.setFont('Helvetica-Bold', 9)
            c.drawString(LEFT, y, e['path'])
            c.setFont('Helvetica', 8)
            c.setFillColor(MUTED)
            c.drawRightString(PAGE_W - RIGHT, y, f"{e['bytes']:,} bytes | not printed")
            c.setFont('Courier', 8)
            c.drawString(LEFT, y - 13, e['sha256'])
            y -= 43
        c.showPage()
        page += 1
    assert page - 1 == total
    c.save()
    reader = PdfReader(buffer)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    for e in manifest['files']:
        writer.add_attachment(e['path'], data[e['path']])
    writer.add_attachment('source-inventory.json', (out / 'source-inventory.json').read_bytes())
    writer.add_attachment('source-allowlist.json', policy_bytes)
    target = out / 'looplight-code.pdf'
    with target.open('wb') as f:
        writer.write(f)
    verified = PdfReader(target)
    assert len(verified.pages) == total, 'Final PDF page count differs.'
    for e in manifest['files']:
        attachments = verified.attachments[e['path']]
        assert len(attachments) == 1
        assert sha256(attachments[0]) == e['sha256'], f"Attachment mismatch: {e['path']}"
    for page_index, p in enumerate(verified.pages, 1):
        extracted = p.extract_text() or ''
        assert extracted.strip(), f'Blank rendered page: {page_index}'
    return {'file': str(target), 'sha256': sha256(target.read_bytes()), 'pages': total,
            'source_attachment_hashes_verified': len(printed),
            'supporting_attachment_hashes_verified': len(referenced),
            'total_inventory_attachment_hashes_verified': len(manifest['files']),
            'rendered_source_rows': sum(len(r) for r in rows.values()),
            'source_pages': source_page_checks}


def create_source_zip(out: Path, manifest: dict[str, Any], data: dict[str, bytes]) -> dict[str, Any]:
    """Write the exact selected files with portable paths and verify every byte."""
    target = out / 'looplight-source.zip'
    contents = dict(data)
    for name in ['source-inventory.json', 'source-inventory.sha256', 'source-inventory.md']:
        if name in contents:
            raise ValueError(f'Generated inventory filename collides with selected source: {name}')
        contents[name] = (out / name).read_bytes()
    contents['SOURCE-SNAPSHOT-README.txt'] = (
        'Looplight source snapshot\n\n'
        'All files selected by source-inventory.json are included at their repository paths.\n'
        'SHA-256 values cover exact source bytes. Hash-listed support files are included,\n'
        'including model weights, synthetic datasets, the lockfile and builder images.\n'
        'Generated artifacts, dependency trees, private credentials and unselected files\n'
        'are not part of this snapshot. Read README.md for setup and test commands.\n'
        'The Firebase browser configuration is public and identifies the deployed project.\n'
        'Use the documented isolated emulators or configure your own Firebase project\n'
        'for independent testing. Do not deploy to another owner\'s project.\n'
    ).encode('utf8')
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, raw in sorted(contents.items()):
            path = Path(name)
            if path.is_absolute() or '..' in path.parts:
                raise ValueError('Unsafe path in source inventory.')
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, raw, compresslevel=9)
    with zipfile.ZipFile(target) as archive:
        assert set(archive.namelist()) == set(contents), 'Source ZIP inventory mismatch.'
        for name, raw in contents.items():
            assert sha256(archive.read(name)) == sha256(raw), f'Source ZIP byte mismatch: {name}'
    return {'file': str(target), 'sha256': sha256(target.read_bytes()),
            'inventory_files_verified': len(manifest['files']), 'total_entries': len(contents)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--allowlist', type=Path, default=Path(__file__).with_name('source-allowlist.json'))
    parser.add_argument('--mono-font', help='Optional path to DejaVuSansMono.ttf or compatible TTF.')
    parser.add_argument('--inventory-only', action='store_true')
    args = parser.parse_args()
    repo = args.repo.expanduser().resolve()
    out = args.out.expanduser().resolve()
    if out == repo or repo in out.parents:
        raise SystemExit('Output must be outside the source checkout to preserve a read-only snapshot.')
    policy_bytes = args.allowlist.read_bytes()
    policy = json.loads(policy_bytes)
    printed, referenced = discover(repo, policy)
    if not printed:
        raise SystemExit('No source files matched the allowlist.')
    included_paths = {p.relative_to(repo).as_posix() for p in printed}
    missing_required = sorted(set(policy.get('required_printed_files', [])) - included_paths)
    if missing_required:
        raise SystemExit('Required release source is absent from the printed inventory: ' + ', '.join(missing_required))
    entries, data = load_sources(repo, printed, referenced)
    font, supported = configure_fonts(args)
    rows, escapes = prepare_rows(entries, data, font, supported)
    manifest: dict[str, Any] = {
        'format': 'looplight-source-inventory-v1',
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'repository': 'https://github.com/shi1720/UnivaBio',
        'snapshot_sha256': sha256(''.join(f"{e['path']}\0{e['sha256']}\n" for e in entries).encode()),
        'allowlist_sha256': sha256(policy_bytes),
        'authorship_note': 'Project source was developed with AI assistance and includes adapted or inherited framework/runtime helpers. The inventory identifies submitted source; it does not assert that every included line was authored from scratch. Dependency notices remain in the repository.',
        'exclusion_note': policy['exclusion_note'],
        'display_escapes': dict(sorted(escapes.items())),
        'files': entries,
    }
    if args.inventory_only:
        write_manifests(out, manifest, data)
        print(json.dumps({'mode': 'inventory_only', 'printed_files': len(printed), 'hash_only_files': len(referenced),
                          'source_lines': sum(e.get('source_lines', 0) for e in entries),
                          'rendered_rows': sum(len(v) for v in rows.values()), 'display_escapes': dict(escapes),
                          'output': str(out)}, indent=2))
        return
    result = create_pdf(out, manifest, rows, data, font, policy_bytes)
    result['source_zip'] = create_source_zip(out, manifest, data)
    changed = [e['path'] for e in entries if sha256((repo / e['path']).read_bytes()) != e['sha256']]
    result['source_changed_during_generation'] = changed
    result['snapshot_sha256'] = manifest['snapshot_sha256']
    (out / 'pdf-verification.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'source_pages'}, indent=2))
    if changed:
        raise SystemExit('The source changed during generation. Wait for a source freeze and regenerate.')


if __name__ == '__main__':
    main()
