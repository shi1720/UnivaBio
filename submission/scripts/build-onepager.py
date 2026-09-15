from pathlib import Path
import argparse
import os
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from pypdf import PdfReader

parser = argparse.ArgumentParser(description='Build the Looplight one-page project PDF.')
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
args = parser.parse_args()
BASE = args.root.resolve()
(BASE / 'output').mkdir(parents=True, exist_ok=True)
if not os.environ.get('LOOPLIGHT_FONT_DIR'):
    raise SystemExit('Set LOOPLIGHT_FONT_DIR to a directory containing NotoSans-Regular.ttf and NotoSans-Bold.ttf.')
FONT = Path(os.environ['LOOPLIGHT_FONT_DIR'])
pdfmetrics.registerFont(TTFont('NotoSans', str(FONT / 'NotoSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSans-Bold', str(FONT / 'NotoSans-Bold.ttf')))
pdfmetrics.registerFontFamily('NotoSans', normal='NotoSans', bold='NotoSans-Bold')

NAVY, BLUE, LIME, MUTED = map(HexColor, ['#102238', '#315bdb', '#c7f578', '#56657a'])
OUT = BASE / 'output/looplight-one-page.pdf'
c = canvas.Canvas(str(OUT), pagesize=(595.28, 841.89))
c.setTitle('Looplight - UnivaBio project description')
c.setAuthor('Shivam Gupta')
c.setSubject('A source-grounded follow-up ledger after hospital discharge')

def text(s, x, y, size=10.2, color=NAVY, bold=False, width=241, leading=None):
    p = Paragraph(s, ParagraphStyle('body', fontName='NotoSans-Bold' if bold else 'NotoSans', fontSize=size, leading=leading or size*1.44, textColor=color, alignment=TA_LEFT, spaceAfter=0))
    w,h = p.wrap(width, 800)
    p.drawOn(c, x, y-h)
    return y-h

def section(title, body, x, y, width=241):
    y = text(title, x, y, 13.0, BLUE, True, width, 17.5)
    y = text(body, x, y-10, 10.15, NAVY, False, width, 14.8)
    return y-18

c.setFillColor(NAVY)
c.rect(0, 633, 595.28, 209, fill=1, stroke=0)
text('LOOPLIGHT', 42, 809, 12, LIME, True, 500)
text('The next step,<br/>accounted for.', 40, 773, 35, HexColor('#ffffff'), True, 515, 41)
text('A follow-up ledger for the days after discharge.', 43, 674, 13, HexColor('#ffffff'), False, 510, 19)

text('Shivam Gupta', 42, 612, 11, NAVY, True, 240)
text('Founder &amp; builder  /  Built with AI-assisted development', 42, 594, 9, MUTED, False, 512)
c.setStrokeColor(HexColor('#dae1e9'))
c.setLineWidth(.6)
c.line(42, 574, 553, 574)

y = 553
y = section('Why this matters', 'Leaving hospital can leave unfinished work: a pending result, a repeat test, or a referral. In a 2005 study of 2,644 discharges at two academic hospitals, 41% of patients had results return after discharge.<super>1</super>', 42, y)
y = section('What the MVP does', '<b>Review the source.</b> Paste text or import a text-based PDF. A trained classifier and rules suggest actions. Users review every sentence and confirm the plan.<br/><br/><b>Name the tracker.</b> Each task keeps its supporting text and date wording. Unclear details remain questions for the care team.<br/><br/><b>Record the ending.</b> Result receipt stays separate from user-reported clinician review. The history retains reported outcomes.', 42, y)
y = section('A plan people can use', 'Signed-in spaces save plans. A printable brief and calendar/JSON exports keep the record portable. The Anita/Maya demonstration uses fictional data.', 42, y)

yr = 553
yr = section('AI you can inspect', '<b>82% raw accuracy</b> and <b>0.816 macro F1</b> on 50 separately authored synthetic challenge examples, after training on 225 synthetic examples. The threshold abstained on <b>44 of 50</b>.<br/><br/>These are sentence-classification results, not clinical validation. Human review remains essential. No paid model API is required.', 316, yr, 237)
yr = section('A business to test', 'First buyer hypothesis: a primary-care or transitions coordinator already chasing discharge follow-up.<br/><br/><b>$149/month for 100 care episodes</b> is a pricing hypothesis. Measure preparation time, corrections, and willingness to pay.', 316, yr, 237)
yr = section('The next proof', 'A supervised pilot should measure missed actions and follow-up resolution. The MVP has no EHR integration or proven health benefit. It carries documented instructions and does not interpret results or make treatment decisions.', 316, yr, 237)

assert min(y,yr) > 116, (y,yr)
c.setStrokeColor(HexColor('#dae1e9'))
c.line(42, 110, 553, 110)
text('MVP for synthetic demonstration. Patient deployment requires clinical and security review.', 42, 98, 8.2, MUTED, False, 515, 11.4)
text('<super>1</super> <link href="https://pubmed.ncbi.nlm.nih.gov/16027454/" color="#315bdb">Roy et al., Annals of Internal Medicine (2005)</link>. Historical two-hospital finding, not a current global estimate.', 42, 79, 7.6, MUTED, False, 515, 10.5)
text('Workflow context: <link href="https://healthit.gov/resources/2025-safer-guide-test-results-reporting-and-follow-up/" color="#315bdb">2025 SAFER Test Results Reporting and Follow-Up Guide</link>. This does not endorse Looplight.', 42, 63, 7.6, MUTED, False, 515, 10.5)
text('<link href="https://github.com/shi1720/UnivaBio" color="#315bdb">github.com/shi1720/UnivaBio</link>', 42, 39, 9.0, BLUE, True, 515, 12)
c.showPage()
c.save()
pdf = PdfReader(OUT)
assert len(pdf.pages) == 1
assert 'Looplight' in pdf.metadata.title
print(f'Wrote {OUT}; one page; body bottoms={y:.1f}, {yr:.1f}')
