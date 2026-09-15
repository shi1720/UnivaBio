"""Preserve a source screenshot and apply its editable PowerPoint crop.

The presentation runtime currently rewrites image.crop during export. This
small OOXML repair changes only the crop and frame, never the image bytes.
"""
import argparse
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('pptx', type=Path)
args = parser.parse_args()
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
for prefix, uri in [('p', P), ('a', A), ('r', R)]:
    ET.register_namespace(prefix, uri)

with ZipFile(args.pptx) as source:
    records = [(entry, source.read(entry.filename)) for entry in source.infolist()]
slide_name = 'ppt/slides/slide3.xml'
data = next(data for entry, data in records if entry.filename == slide_name)
root = ET.fromstring(data)
pictures = root.findall(f'.//{{{P}}}pic')
if len(pictures) != 1:
    raise ValueError(f'Expected exactly one source screenshot on slide 3, got {len(pictures)}')
picture = pictures[0]
fill = picture.find(f'{{{P}}}blipFill')
for existing in list(fill.findall(f'{{{A}}}srcRect')):
    fill.remove(existing)
crop = ET.Element(f'{{{A}}}srcRect', {'l': '0', 't': '0', 'r': '50000', 'b': '56000'})
fill.insert(1, crop)
xfrm = picture.find(f'{{{P}}}spPr/{{{A}}}xfrm')
xfrm.find(f'{{{A}}}off').attrib.update(x=str(72*9525), y=str(166*9525))
xfrm.find(f'{{{A}}}ext').attrib.update(cx=str(626*9525), cy=str(500*9525))
updated = ET.tostring(root, encoding='utf-8', xml_declaration=True)
temporary = args.pptx.with_suffix('.crop-tmp.pptx')
with ZipFile(temporary, 'w') as destination:
    for entry, original in records:
        destination.writestr(entry, updated if entry.filename == slide_name else original)
temporary.replace(args.pptx)
print('Applied native slide-3 crop. Original screenshot bytes preserved.')
