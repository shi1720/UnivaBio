"""Create an editable SVG thumbnail using an unchanged real app capture."""
import argparse,base64,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--font-dir',type=Path,required=True);a=p.parse_args();root=a.root.resolve();out=root/'output';out.mkdir(exist_ok=True)
raw=root/'captures/raw-12';meta=json.loads((raw/'frames.json').read_text());source=raw/meta['frames'][-1]['file'];im=Image.open(source).convert('RGB')
crop=[830,75,610,625];x,y,w,h=crop
preview=im.crop((x,y,x+w,y+h)).resize((664,680),Image.Resampling.LANCZOS)
canvas=Image.new('RGB',(1920,1080),'#102238');d=ImageDraw.Draw(canvas)
font=lambda size,bold=False:ImageFont.truetype(str(a.font_dir/('NotoSans-Bold.ttf' if bold else 'NotoSans-Regular.ttf')),size)
d.rounded_rectangle((88,77,142,139),radius=14,outline='#c7f578',width=3);d.line((107,92,107,124),fill='#c7f578',width=5);d.ellipse((105,99,123,117),fill='#c7f578')
d.text((163,74),'looplight',font=font(56,True),fill='white')
d.text((91,239),'THE DAYS AFTER DISCHARGE',font=font(27,True),fill='#c7f578')
d.text((86,306),'The next step,',font=font(96,True),fill='white')
d.text((86,423),'accounted for.',font=font(96,True),fill='white')
d.text((91,582),'A source-grounded follow-up ledger.',font=font(37),fill='#dce4ef')
for ypos,label in [(697,'Read the source'),(756,'Name the tracker'),(815,'Record the ending')]:
 d.rounded_rectangle((92,ypos+9,110,ypos+27),radius=5,fill='#c7f578');d.text((130,ypos),label,font=font(32),fill='white')
d.rounded_rectangle((1130,147,1842,901),radius=30,fill='#315bdb');d.rounded_rectangle((1145,162,1827,886),radius=20,fill='white');canvas.paste(preview,(1154,173))
d.text((1160,860),'ACTUAL APP / FICTIONAL EXAMPLE',font=font(18,True),fill='#315bdb')
d.line((91,956,1830,956),fill='#3e5167',width=2);d.text((91,985),'Shivam Gupta',font=font(28,True),fill='white');d.text((1140,985),'looplight-care.web.app',font=font(28),fill='#c7f578')
canvas.save(out/'looplight-thumbnail.png')
data=base64.b64encode(source.read_bytes()).decode();sx=664/610;ix=1154-830*sx;iy=173-75*sx
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#102238"/><style>text{{font-family:'Noto Sans',sans-serif;fill:white}}.bold{{font-weight:700}}</style><rect x="88" y="77" width="54" height="62" rx="14" fill="none" stroke="#c7f578" stroke-width="3"/><path d="M107 92V124" stroke="#c7f578" stroke-width="5"/><circle cx="114" cy="108" r="9" fill="#c7f578"/><text x="163" y="134" font-size="56" class="bold">looplight</text><text x="91" y="269" font-size="27" class="bold" style="fill:#c7f578">THE DAYS AFTER DISCHARGE</text><text x="86" y="408" font-size="96" class="bold">The next step,</text><text x="86" y="525" font-size="96" class="bold">accounted for.</text><text x="91" y="623" font-size="37" style="fill:#dce4ef">A source-grounded follow-up ledger.</text><rect x="1130" y="147" width="712" height="754" rx="30" fill="#315bdb"/><rect x="1145" y="162" width="682" height="724" rx="20" fill="white"/><defs><clipPath id="ui"><rect x="1154" y="173" width="664" height="680"/></clipPath></defs><image x="{ix}" y="{iy}" width="{1440*sx}" height="{810*sx}" href="data:image/jpeg;base64,{data}" clip-path="url(#ui)"/><text x="1160" y="880" font-size="18" class="bold" style="fill:#315bdb">ACTUAL APP / FICTIONAL EXAMPLE</text>'''
for ypos,label in [(697,'Read the source'),(756,'Name the tracker'),(815,'Record the ending')]:
 svg+=f'<rect x="92" y="{ypos+9}" width="18" height="18" rx="5" fill="#c7f578"/><text x="130" y="{ypos+35}" font-size="32">{label}</text>'
svg+='<path d="M91 956H1830" stroke="#3e5167" stroke-width="2"/><text x="91" y="1015" font-size="28" class="bold">Shivam Gupta</text><text x="1140" y="1015" font-size="28" style="fill:#c7f578">looplight-care.web.app</text></svg>'
(out/'looplight-thumbnail.svg').write_text(svg)
(out/'thumbnail-provenance.json').write_text(json.dumps({'source':str(source.relative_to(root)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'native_crop':crop,'claim':'Real app capture, cropped for framing. No generated or modified interface content. SVG retains the entire original embedded screenshot.','png_dimensions':[1920,1080]},indent=2)+'\n')
print(out/'looplight-thumbnail.png')
