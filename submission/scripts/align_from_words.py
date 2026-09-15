"""Map caption text to supplied word timestamps without inventing timing.

Input word timestamps must come from the actual scene audio. This is strict:
transcript differences stop the build and require review rather than guesswork.
"""
import argparse
import json
from pathlib import Path
import re


def clean(text):
    return ''.join(re.findall(r'[a-z0-9]', text.lower()))


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--scene', required=True)
    p.add_argument('--words', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a=p.parse_args()
    story=json.loads(a.manifest.read_text())
    scenes=[s for s in story['scenes'] if s['id']==a.scene]
    if len(scenes)!=1:
        raise ValueError('Scene id is absent or duplicated.')
    words_data=json.loads(a.words.read_text())
    words=words_data['words'] if isinstance(words_data,dict) else words_data
    pieces=[]
    cursor=0
    last_start=0
    for word in words:
        value=clean(word.get('word',word.get('text','')))
        if not value:
            continue
        if not (0 <= word['start'] < word['end'] and word['start'] >= last_start):
            raise ValueError('Word timing is invalid or out of order.')
        pieces.append({'a':cursor,'b':cursor+len(value),'text':value,'start':word['start'],'end':word['end']})
        cursor+=len(value)
        last_start=word['start']
    captions=scenes[0]['captions']
    expected=''.join(clean(c['text']) for c in captions)
    observed=''.join(w['text'] for w in pieces)
    if expected!=observed:
        index=next((i for i,(x,y) in enumerate(zip(expected,observed)) if x!=y),min(len(expected),len(observed)))
        raise ValueError(f'Audio transcript differs from script near normalized character {index}. Review the words and recording; no timings were generated.')
    result=[]
    cursor=0
    for cue in captions:
        end=cursor+len(clean(cue['text']))
        covered=[w for w in pieces if w['a']>=cursor and w['b']<=end]
        if not covered or covered[0]['a']!=cursor or covered[-1]['b']!=end:
            raise ValueError(f'Caption boundary falls inside a timestamped word: {cue["id"]}')
        result.append({'cue_id':cue['id'],'text':cue['text'],'start':covered[0]['start'],'end':covered[-1]['end']})
        cursor=end
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps({'timing_source':str(a.words),'cues':result},indent=2)+'\n')
    print(f'Aligned {len(result)} captions from actual word timestamps. Listen and check the result.')

if __name__=='__main__':
    main()
