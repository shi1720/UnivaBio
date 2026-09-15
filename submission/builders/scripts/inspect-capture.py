"""Read capture dimensions and its real encoding without editing the image."""
import argparse
import json
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('capture');a=p.parse_args()
with Image.open(a.capture) as image:
 if image.format not in ['PNG','JPEG']:
  raise ValueError('Use an original PNG or JPEG capture.')
 result={'width':image.width,'height':image.height,'content_type':Image.MIME[image.format]}
 image.verify()
print(json.dumps(result))
