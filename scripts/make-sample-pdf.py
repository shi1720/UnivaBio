"""Generate the entirely fictional, text-based discharge example used in the demo."""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'public/examples';out.mkdir(parents=True,exist_ok=True)
lines=[('Hospital stay','Anita was treated for a respiratory infection. Her condition improved during admission.'),('Unfinished care','Blood culture results are pending at discharge.\nFollow up with your primary care clinician within 7 days of discharge.\nRepeat a complete blood count in 2 weeks.'),('Medication and safety instructions','Continue your medication exactly as prescribed on the medication list.\nSeek emergency care for severe chest pain or difficulty breathing.'),('Questions and support','Bring this discharge summary to your next visit.')]
c=canvas.Canvas(str(out/'anita-discharge.pdf'),pagesize=A4)
c.setTitle('Anita Rao - fictional discharge example | Looplight')
w,h=A4
c.setFillColor(colors.HexColor('#102238'));c.rect(0,h-145,w,145,fill=1,stroke=0)
c.setFillColor(colors.HexColor('#c7f578'));c.setFont('Helvetica-Bold',12);c.drawString(43,h-48,'LOOPLIGHT / FICTIONAL EXAMPLE')
c.setFillColor(colors.white);c.setFont('Helvetica-Bold',26);c.drawString(43,h-89,'Discharge summary')
c.setFont('Helvetica',11);c.drawString(43,h-117,'Not a real patient record. Not medical advice.')
c.setFillColor(colors.HexColor('#263e5a'));c.setFont('Helvetica-Bold',14);c.drawString(43,h-187,'Patient: Anita Rao')
c.setFont('Helvetica',11);c.drawString(43,h-211,'Discharge destination: Home with daughter Maya.')
c.drawString(43,h-231,'Discharge date: enter the example date in Looplight before analysis.')
y=h-282
import textwrap
for title,text in lines:
 c.setFont('Helvetica-Bold',13);c.setFillColor(colors.HexColor('#315bdb'));c.drawString(43,y,title);y-=24
 c.setFont('Helvetica',11);c.setFillColor(colors.HexColor('#344f6d'))
 for paragraph in text.split('\n'):
  for line in textwrap.wrap(paragraph,88):c.drawString(43,y,line);y-=17
  y-=5
 y-=19
c.setStrokeColor(colors.HexColor('#dce5ef'));c.line(43,65,w-43,65)
c.setFont('Helvetica',9);c.setFillColor(colors.HexColor('#71869e'));c.drawString(43,44,'Synthetic fixture authored for UnivaBio 2026 | Shivam Gupta | looplight')
c.showPage();c.save()
text='FICTIONAL EXAMPLE - NOT A REAL PATIENT RECORD\nPatient: Anita Rao\nDischarge destination: Home with daughter Maya.\n\n'+'\n\n'.join(title+'\n'+body for title,body in lines)
(out/'anita-discharge.txt').write_text(text+'\n')
qa=ROOT/'tmp/pdfs';qa.mkdir(parents=True,exist_ok=True)
blank=canvas.Canvas(str(qa/'no-readable-text.pdf'),pagesize=A4);blank.setFillColor(colors.HexColor('#dce5ef'));blank.rect(60,60,400,650,fill=1,stroke=0);blank.showPage();blank.save()
print(out/'anita-discharge.pdf')
