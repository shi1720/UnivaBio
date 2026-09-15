"""Snapshot application source read-only, after dataset freeze and before inference."""
from pathlib import Path
import argparse
import difflib
import hashlib
import json

ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--checkout',type=Path,required=True,help='Application checkout containing lib/engine.ts')
args=parser.parse_args()
SOURCE=args.checkout.resolve()
lock=json.loads((ROOT/'dataset.lock.json').read_text())
assert hashlib.sha256((ROOT/'dataset.json').read_bytes()).hexdigest()==lock['dataset_sha256']
if (ROOT/'snapshot/manifest.json').exists():
    raise RuntimeError('Engine snapshot already frozen; use a new versioned snapshot for a future evaluation.')
files=['lib/engine.ts','lib/dates.ts','lib/types.ts','ml/inference.ts','ml/model.json']
manifest={'dataset_sha256':lock['dataset_sha256'],'source_checkout':str(SOURCE),'files':{},
          'policy':'Byte-for-byte application snapshot made after dataset freeze; no checkout writes. Baseline changes scoreSentence only.'}
for name in files:
    data=(SOURCE/name).read_bytes()
    dest=ROOT/'snapshot'/name
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(data)
    manifest['files'][name]=hashlib.sha256(data).hexdigest()
engine=(ROOT/'snapshot/lib/engine.ts').read_text()
old="function scoreSentence(text: string): { label: Category; score: number } {\n const result=classifier(text);return {label:result.label,score:result.confidence};\n}"
new="function scoreSentence(_text: string): { label: Category; score: number } {\n return {label:'unknown',score:0};\n}"
assert engine.count(old)==1,'Scoring adapter shape changed; inspect without altering original engine.'
baseline=engine.replace(old,new)
(ROOT/'snapshot/lib/engine.rules-only.ts').write_text(baseline)
(ROOT/'snapshot/rules-only-adapter.patch').write_text(''.join(difflib.unified_diff(engine.splitlines(keepends=True),baseline.splitlines(keepends=True),fromfile='engine.ts',tofile='engine.rules-only.ts')))
manifest['rules_only_adapter_sha256']=hashlib.sha256(baseline.encode()).hexdigest()
(ROOT/'snapshot/package.json').write_text('{"private":true,"type":"module"}\n')
(ROOT/'snapshot/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
