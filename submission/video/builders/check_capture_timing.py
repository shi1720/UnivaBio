"""Check sampled converted video states against the original capture images."""
import argparse,json,math,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--ffmpeg',required=True);a=p.parse_args();r=a.root.resolve();qa=r/'output/qa/timing-samples';qa.mkdir(exist_ok=True);rows=[]
for path in sorted((r/'captures').glob('raw-*/frames.json')):
 d=json.loads(path.read_text());sid=path.parent.name.removeprefix('raw-');fs=d['frames'];origin=fs[0]['at'];end=float(d['elapsed'])
 for at in sorted(set([min(1.0,end-.1),end/2,end-.15])):
  op=qa/f'{sid}-{at:.3f}.png';cmd=[a.ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(at),'-i',str(r/f'captures/scene-{sid}.mp4'),'-frames:v','1',str(op)];res=subprocess.run(cmd,capture_output=True,text=True);assert res.returncode==0
  actual=np.asarray(Image.open(op).convert('RGB'),dtype=np.float64);candidate=[]
  for target in [at-1/30,at,at+1/30]:
   selected=max((f for f in fs if f['at']-origin<=target),key=lambda f:f['at'],default=fs[0]);reference=np.asarray(Image.open(path.parent/selected['file']).convert('RGB'),dtype=np.float64);mse=float(np.mean((actual-reference)**2));psnr=100.0 if mse==0 else 10*math.log10(255**2/mse);candidate.append((psnr,selected['file']))
  best=max(candidate);assert best[0]>=33,(sid,at,best)
  rows.append({'scene':sid,'seconds':at,'best_source_frame':best[1],'psnr_db':round(best[0],2)})
report={'sample_count':len(rows),'minimum_psnr_db':min(x['psnr_db'] for x in rows),'tolerance_seconds':1/30,'all_pass':True,'comparison':'Decoded converted video vs original JPEG at the corresponding capture timestamp, allowing one 30-fps sampling interval. No image rescaling.','samples':rows};(r/'output/qa/capture-timing-checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='samples'},indent=2))
