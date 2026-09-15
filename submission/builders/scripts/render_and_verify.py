"""Render a deck with the explicitly supplied bundled LibreOffice and Poppler."""
import argparse
import json
import os
from pathlib import Path
import subprocess
from pypdf import PdfReader

p=argparse.ArgumentParser()
p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent)
p.add_argument('--pptx',type=Path,required=True)
p.add_argument('--soffice',type=Path,default=os.environ.get('BUNDLED_SOFFICE'))
p.add_argument('--pdftoppm',type=Path,default=os.environ.get('BUNDLED_PDFTOPPM'))
a=p.parse_args();root=a.root.resolve()
assert a.soffice and a.soffice.is_absolute(),'Supply the bundled LibreOffice absolute path. Never use the desktop-installed application.'
assert a.pdftoppm and a.pdftoppm.is_absolute(),'Supply the bundled Poppler pdftoppm absolute path.'
assert a.soffice.is_file() and a.pdftoppm.is_file()
assert '/Applications/LibreOffice.app/' not in str(a.soffice),'Desktop-installed LibreOffice is not allowed.'
work=root/'.build'/'render';work.mkdir(parents=True,exist_ok=True)
qa=root/'qa'/a.pptx.stem;qa.mkdir(parents=True,exist_ok=True)
out=root/'output';out.mkdir(exist_ok=True)
profile=(work/'profile').as_uri()
result=subprocess.run([str(a.soffice),f'-env:UserInstallation={profile}','--headless','--convert-to','pdf','--outdir',str(out),str(a.pptx.resolve())],capture_output=True,text=True)
(work/'libreoffice.log').write_text(result.stdout+result.stderr)
assert result.returncode==0,result.stderr
pdf=out/f'{a.pptx.stem}.pdf';assert pdf.is_file()
assert len(PdfReader(pdf).pages)==7
result=subprocess.run([str(a.pdftoppm),'-png','-scale-to-x','1280','-scale-to-y','720',str(pdf),str(qa/'slide')],capture_output=True,text=True)
assert result.returncode==0,result.stderr
print(json.dumps({'pdf':str(pdf),'pages':7,'rendered_frames':str(qa),'visual_qa':'Pending visual inspection of all seven rendered slides.'}))
