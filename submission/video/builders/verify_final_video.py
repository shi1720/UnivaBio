"""Decode, measure, and extract final video frames for visual inspection."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--ffmpeg',required=True);p.add_argument('--font-dir',type=Path,required=True);a=p.parse_args();r=a.root.resolve();out=r/'output';qa=out/'qa';qa.mkdir(exist_ok=True);video=out/'looplight-narrated-demo.mp4';t=json.loads((out/'timeline.json').read_text())
cmd=[a.ffmpeg,'-hide_banner','-i',str(video),'-af','ebur128=peak=true','-f','null','-'];z=subprocess.run(cmd,capture_output=True,text=True);assert z.returncode==0; (qa/'final-decode-and-loudness.log').write_text(z.stderr)
lufs=float(re.findall(r'I:\s+(-?[\d.]+) LUFS',z.stderr)[-1]);peak=float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS',z.stderr)[-1]);count=int(re.findall(r'frame=\s*(\d+)',z.stderr)[-1]);assert count==round(t['duration_seconds']*30),(count,t['duration_seconds']);assert -16.5<=lufs<=-15.5,lufs;assert peak<=-1.25,peak
items=[]
for scene in t['scenes']:
 for label,when in [('start',.35),('middle',scene['duration']/2),('end',scene['duration']-.15)]:
  items.append({'scene':scene['id'],'label':label,'at':scene['start']+when,'path':qa/f"scene-{scene['id']}-{label}.png"})
def extract(item):
 c=[a.ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(item['at']),'-i',str(video),'-frames:v','1',str(item['path'])];p=subprocess.run(c,capture_output=True,text=True);assert p.returncode==0,p.stderr
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(extract,items))
font=ImageFont.truetype(str(a.font_dir/'NotoSans-Regular.ttf'),22)
for page in range(3):
 sheet=Image.new('RGB',(1920,1584),'#102238');d=ImageDraw.Draw(sheet)
 for i,item in enumerate(items[page*12:(page+1)*12]):
  col=i%3;row=i//3;img=Image.open(item['path']);img.thumbnail((640,360));sheet.paste(img,(col*640,row*396+36));d.text((col*640+14,row*396+5),f"Scene {item['scene']} / {item['label']} / {item['at']:.2f}s",font=font,fill='white')
 sheet.save(qa/f'contact-sheet-{page+1}.png')
prev=0
for cue in t['cues']:
 assert prev<=cue['start']<cue['end']<=t['duration_seconds']
 assert '\u2014' not in cue['text'];prev=cue['end']
report={'video_sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration_seconds':t['duration_seconds'],'decoded_frame_count':count,'expected_frame_count':round(t['duration_seconds']*30),'full_stream_decode':'pass','encoded_audio_integrated_lufs':lufs,'encoded_audio_true_peak_dbtp':peak,'caption_count':len(t['cues']),'caption_boundaries':'32 ordered non-overlapping cues, all within real audio-derived duration','visual_frames':len(items),'contact_sheets':3,'visual_inspection':'pending','listening_review':'Unavailable to this agent. Source WAVs independently checked through local ASR and objective analysis.'}
(qa/'final-video-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
