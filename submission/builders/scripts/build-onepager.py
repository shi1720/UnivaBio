"""Build the one-page Firebase project description from editable content.json."""
import argparse
import io
import json
import os
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from pypdf import PdfReader

parser=argparse.ArgumentParser()
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent)
parser.add_argument('--content',type=Path)
parser.add_argument('--font-dir',type=Path,default=os.environ.get('LOOPLIGHT_FONT_DIR'))
parser.add_argument('--check-layout',action='store_true',help='Measure text fit without writing a PDF.')
args=parser.parse_args()
root=args.root.resolve()
source=args.content or root/'content.json'
raw=source.read_text()
assert '\u2014' not in raw,'Em dashes are not allowed.'
data=json.loads(raw)
assert args.font_dir,'Set LOOPLIGHT_FONT_DIR or pass --font-dir.'
fonts=args.font_dir.resolve()
for name in ['NotoSans','NotoSans-Bold']:
 filename='NotoSans-Regular.ttf' if name=='NotoSans' else 'NotoSans-Bold.ttf'
 pdfmetrics.registerFont(TTFont(name,str(fonts/filename)))
pdfmetrics.registerFontFamily('NotoSans',normal='NotoSans',bold='NotoSans-Bold')
navy,blue,lime,muted=map(HexColor,['#102238','#315bdb','#c7f578','#56657a'])
ready=data['release']['status']=='ready'
if ready:
 assert data['release']['qa_status']=='reported','Final release needs the supplied QA report, without claiming unperformed tests.'
 assert data['release']['qa_summary'].strip()
(root/'output').mkdir(exist_ok=True,parents=True)
output=root/'output'/('looplight-one-page.pdf' if ready else 'looplight-one-page-draft.pdf')
buffer=io.BytesIO()
c=canvas.Canvas(buffer,pagesize=(595.28,841.89))
c.setTitle('Looplight - Firebase project description')
c.setAuthor(data['creator'])
c.setSubject(data['subtitle'])

def text(value,x,y,size=10.2,color=navy,bold=False,width=241,leading=None):
 p=Paragraph(value,ParagraphStyle('text',fontName='NotoSans-Bold' if bold else 'NotoSans',fontSize=size,leading=leading or size*1.44,textColor=color,alignment=TA_LEFT))
 _,height=p.wrap(width,800)
 p.drawOn(c,x,y-height)
 return y-height

def section(item,x,y,width):
 y=text(item['title'],x,y,13,blue,True,width,17.5)
 y=text(item['body'],x,y-10,10.15,navy,False,width,14.8)
 return y-18

c.setFillColor(navy);c.rect(0,633,595.28,209,fill=1,stroke=0)
text(data['project'].upper(),42,809,12,lime,True,500)
if not ready:
 text('DRAFT / FINAL FIREBASE QA PENDING',330,808,7.5,lime,False,224)
text(data['tagline'].replace('\n','<br/>'),40,773,35,HexColor('#ffffff'),True,515,41)
text(data['subtitle'],43,674,13,HexColor('#ffffff'),False,510,19)
text(data['creator'],42,612,11,navy,True,240)
text(data['credit'].replace('&','&amp;'),42,594,9,muted,False,512)
c.setStrokeColor(HexColor('#dae1e9'));c.setLineWidth(.6);c.line(42,574,553,574)
yl=yr=553
for section_data in data['one_page']['left']:
 yl=section(section_data,42,yl,241)
for section_data in data['one_page']['right']:
 yr=section(section_data,316,yr,237)
assert min(yl,yr)>116,f'Text overflow: left bottom {yl:.1f}, right bottom {yr:.1f}. Edit copy before export.'
c.line(42,110,553,110)
text(data['one_page']['footer'],42,98,8.2,muted,False,515,11.4)
source1,source2=data['sources']
text(f'<super>1</super> <link href="{source1["url"]}" color="#315bdb">{source1["title"]}</link>. Historical two-hospital finding, not a current global estimate.',42,79,7.6,muted,False,515,10.5)
text(f'Workflow context: <link href="{source2["url"]}" color="#315bdb">{source2["title"]}</link>. This does not endorse Looplight.',42,63,7.6,muted,False,515,10.5)
text(f'<link href="{data["app_url"]}" color="#315bdb">{data["app_label"]}</link>',42,39,9,blue,True,250,12)
text(f'<link href="{data["repo_url"]}" color="#315bdb">{data["repo_label"]}</link>',316,39,8.8,blue,True,237,12)
if args.check_layout:
 print(json.dumps({'layout':'fits','left_bottom':yl,'right_bottom':yr,'pdf_written':False}))
else:
 c.showPage();c.save()
 output.write_bytes(buffer.getvalue())
 pdf=PdfReader(output)
 assert len(pdf.pages)==1
 print(json.dumps({'output':str(output),'pages':1,'status':data['release']['status'],'left_bottom':yl,'right_bottom':yr}))
