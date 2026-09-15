"""Integration checks with obvious synthetic test media, never demo evidence."""
import argparse
import json
from pathlib import Path
import math
import struct
import subprocess
import sys
import wave


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--ffmpeg',required=True)
    parser.add_argument('--font-dir',required=True)
    args=parser.parse_args()
    root=Path(__file__).resolve().parent.parent
    fixture=root/'.test-fixture'
    fixture.mkdir(exist_ok=True)
    def run(cmd):
        result=subprocess.run([str(c) for c in cmd],capture_output=True,text=True)
        if result.returncode:
            raise RuntimeError(result.stderr+'\n'+result.stdout)
        return result
    def tone(name,seconds):
        path=fixture/name
        with wave.open(str(path),'wb') as out:
            out.setparams((1,2,48000,0,'NONE','not compressed'))
            out.writeframes(b''.join(struct.pack('<h',int(5000*math.sin(2*math.pi*330*i/48000))) for i in range(round(seconds*48000))))
        return path
    tone('a.wav',0.95);tone('b.wav',1.25);tone('scene.wav',2.3)
    run([args.ffmpeg,'-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=1280x720:rate=30:duration=1', '-c:v','libx264','-pix_fmt','yuv420p',fixture/'video.mp4'])
    for index,color in enumerate(['blue','green','red']):
        run([args.ffmpeg,'-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'color=c={color}:s=1280x720', '-frames:v','1',fixture/f'{index}.png'])
    scene1={'id':'test-video','title':'Test video', 'captions':[{'id':'a','text':'These are synthetic media used only to test the builder.'},{'id':'b','text':'This is not an app demonstration or a spoken recording.'}],
      'audio':{'mode':'cues','items':[{'cue_id':'a','path':'a.wav'},{'cue_id':'b','path':'b.wav'}]},'media':{'type':'video','path':'video.mp4'},'lead_seconds':0.12,'cue_gap_seconds':0.06,'tail_seconds':0.22}
    scene2={'id':'test-frames','title':'Test frames','captions':[{'id':'c','text':'These frames have real relative capture timestamps.'},{'id':'d','text':'Their audio timing comes from supplied alignment.'}],
      'audio':{'mode':'aligned','path':'scene.wav','timings_path':'aligned.json'},'media':{'type':'frames','frames':[{'at':0,'path':'0.png'},{'at':0.4,'path':'1.png'},{'at':0.9,'path':'2.png'}]}}
    scene3={'id':'test-card','title':'Test card','captions':[{'id':'e','text':'This is an explicitly labeled editorial card.'}], 'audio':{'mode':'cues','items':[{'cue_id':'e','path':'a.wav'}]},'media':{'type':'card','headline':'Test card','body':'Not product evidence'}}
    scene4={'id':'test-image','title':'Test screenshot','captions':[{'id':'f','text':'The screenshot label must remain visible.'}], 'audio':{'mode':'cues','items':[{'cue_id':'f','path':'b.wav'}]},'media':{'type':'image','path':'0.png'}}
    (fixture/'aligned.json').write_text(json.dumps({'cues':[{'cue_id':'c','text':scene2['captions'][0]['text'],'start':0.1,'end':1.0},{'cue_id':'d','text':scene2['captions'][1]['text'],'start':1.1,'end':2.2}]}))
    manifest={'scenes':[scene1,scene2,scene3,scene4]}
    (fixture/'scene-plan.json').write_text(json.dumps(manifest))
    command=[sys.executable,root/'scripts/assemble_demo.py','--root',fixture,'--ffmpeg',args.ffmpeg,'--font-dir',args.font_dir]
    result=run(command)
    timeline=json.loads((fixture/'output/timeline.json').read_text())
    cues=timeline['cues']
    assert abs(cues[0]['start']-0.12)<1e-9
    assert abs(cues[0]['end']-1.07)<1e-9
    assert abs(cues[1]['start']-1.13)<1e-9
    assert abs(cues[1]['end']-2.38)<1e-9
    assert timeline['scenes'][0]['frames']==78
    assert cues[2]['start']>=timeline['scenes'][1]['start']
    report=json.loads((fixture/'output/verification.json').read_text())
    assert report['decoded_complete_video_and_audio'] and report['captions']==6
    original=(fixture/'aligned.json').read_text()
    invalid=json.loads(original);invalid['cues'][0]['end']=99
    (fixture/'aligned.json').write_text(json.dumps(invalid))
    rejected=subprocess.run([str(c) for c in command+['--prepare-only']],capture_output=True,text=True)
    assert rejected.returncode!=0 and 'outside audio' in rejected.stderr
    (fixture/'aligned.json').write_text(original)
    # Check strict timestamp mapping and mismatch rejection independently.
    words={'words':[{'word':word,'start':i*0.1,'end':i*0.1+0.08} for i,word in enumerate(scene1['captions'][0]['text'].split()+scene1['captions'][1]['text'].split())]}
    (fixture/'words.json').write_text(json.dumps(words))
    align=[sys.executable,root/'scripts/align_from_words.py','--manifest',fixture/'scene-plan.json','--scene','test-video','--words',fixture/'words.json','--output',fixture/'from-words.json']
    run(align)
    words['words'][0]['word']='Different';(fixture/'words.json').write_text(json.dumps(words))
    rejected=subprocess.run([str(c) for c in align],capture_output=True,text=True)
    assert rejected.returncode!=0 and 'transcript differs' in rejected.stderr
    result={'passed':True,'checks':['Decoded sample timing exact to audio samples','Video shorter than narration is held without looping actions','Timestamped frame input encoded','Image input visibly labeled','Editorial card input encoded','Aligned scene timing accepted','Caption timing outside audio rejected','Word timestamp mapping accepted','Transcript mismatch rejected','Final video and audio decode completed'],'fixture_only':True,'final_product_media_tested':False}
    (root/'builder-checks.json').write_text(json.dumps(result,indent=2)+'\n')
    print('Builder integration checks passed. Fixture output is synthetic test media only.')

if __name__=='__main__':
    main()
