"""Apply explicit editable screenshot crops without changing embedded image bytes."""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

p=argparse.ArgumentParser()
p.add_argument('pptx',type=Path)
p.add_argument('plan',type=Path)
a=p.parse_args()
P='http://schemas.openxmlformats.org/presentationml/2006/main'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
for prefix,uri in [('p',P),('a',A),('r',R)]:
 ET.register_namespace(prefix,uri)
with ZipFile(a.pptx) as src:
 records=[(entry,src.read(entry.filename)) for entry in src.infolist()]
original={entry.filename:data for entry,data in records}
changes={}
for item in json.loads(a.plan.read_text()):
 name=f'ppt/slides/slide{item["slide"]}.xml'
 root=ET.fromstring(changes.get(name,original[name]))
 pictures=root.findall(f'.//{{{P}}}pic')
 picture=pictures[item['image_index']]
 fill=picture.find(f'{{{P}}}blipFill')
 for current in list(fill.findall(f'{{{A}}}srcRect')):
  fill.remove(current)
 attrs={k:str(round(v*100000)) for k,v in zip(['l','t','r','b'],item['crop'])}
 fill.insert(1,ET.Element(f'{{{A}}}srcRect',attrs))
 x,y,w,h=item['frame']
 xfrm=picture.find(f'{{{P}}}spPr/{{{A}}}xfrm')
 xfrm.find(f'{{{A}}}off').attrib.update(x=str(round(x*9525)),y=str(round(y*9525)))
 xfrm.find(f'{{{A}}}ext').attrib.update(cx=str(round(w*9525)),cy=str(round(h*9525)))
 changes[name]=ET.tostring(root,encoding='utf-8',xml_declaration=True)
temp=a.pptx.with_suffix('.cropped.pptx')
with ZipFile(temp,'w') as dst:
 for entry,data in records:
  dst.writestr(entry,changes.get(entry.filename,data))
with ZipFile(temp) as final:
 for name,data in original.items():
  if name.startswith('ppt/media/'):
   assert final.read(name)==data,'Screenshot bytes changed.'
temp.replace(a.pptx)
print(f'Applied {len(json.loads(a.plan.read_text()))} editable screenshot crop frames; media unchanged.')
