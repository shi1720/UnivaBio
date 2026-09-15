"""Build a silent 1080p screenshot walkthrough and matching subtitles.

Requires FFmpeg with libx264, drawtext, and libass. The imageio-ffmpeg wheel is
an optional way to obtain FFmpeg. Original screenshot files remain unchanged.
Only explicit blank-edge or native dialog-boundary crops are permitted.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import textwrap

ROOT_DEFAULT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=ROOT_DEFAULT)
parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG_BIN'))
parser.add_argument('--font-dir', type=Path, default=os.environ.get('LOOPLIGHT_FONT_DIR'))
parser.add_argument('--storyboard', type=Path)
parser.add_argument('--prepare-only', action='store_true')
parser.add_argument('--scene-preview', type=int, help='Render one scene to the private build directory, then stop.')
args = parser.parse_args()
root = args.root.resolve()
output = root / 'output'
work = root / '.build' / 'video'
for directory in [output, work]:
    directory.mkdir(parents=True, exist_ok=True)

def executable():
    if args.ffmpeg:
        return str(Path(args.ffmpeg).expanduser().resolve())
    if shutil.which('ffmpeg'):
        return shutil.which('ffmpeg')
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        raise SystemExit('Pass --ffmpeg, set FFMPEG_BIN, or install imageio-ffmpeg in an isolated environment.')

def run(command, logname):
    result = subprocess.run(command, capture_output=True, text=True)
    (work / logname).write_text(result.stdout + result.stderr)
    if result.returncode or 'Stray %' in result.stderr or 'Error applying' in result.stderr:
        raise RuntimeError(f'{logname}: {result.stderr[-3500:]}')
    return result

def ffpath(p):
    # FFmpeg filtergraph quoting, independent of shell parsing.
    return str(p).replace('\\', '\\\\').replace(':', '\\:').replace("'", "'\\''")

def srt_time(seconds):
    millis = round(seconds*1000)
    h, rem = divmod(millis, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def ass_time(seconds):
    centis = round(seconds*100)
    h, rem = divmod(centis, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f'{h}:{m:02}:{s:02}.{cs:02}'

def caption_chunks(text, max_chars=91):
    words = text.split()
    chunks, current = [], []
    for word in words:
        proposed = ' '.join(current + [word])
        if current and (len(proposed) > max_chars or len(current) >= 16):
            chunks.append(' '.join(current))
            current = []
        current.append(word)
        if re.search(r'[.!?]$', word) and len(' '.join(current)) >= 40:
            chunks.append(' '.join(current))
            current = []
    if current:
        if chunks and len(current) <= 3 and len(chunks[-1] + ' ' + ' '.join(current)) <= max_chars:
            chunks[-1] += ' ' + ' '.join(current)
        else:
            chunks.append(' '.join(current))
    for index in range(1,len(chunks)):
        tail=chunks[index].split()
        previous=chunks[index-1].split()
        take=max(0,5-len(tail))
        if take and len(previous)-take >= 5:
            candidate=' '.join(previous[-take:]+tail)
            if len(candidate)<=max_chars:
                chunks[index-1]=' '.join(previous[:-take])
                chunks[index]=candidate
    return chunks

source = (output / 'demo-script.md').read_text()
verbatim = source.split('## Verbatim voiceover\n',1)[1].split('\n## Shot list',1)[0].strip()
paragraphs = [p.strip() for p in verbatim.split('\n\n') if p.strip()]
story = json.loads((args.storyboard or root/'assets'/'walkthrough-storyboard.json').read_text())
scenes = story['scenes']
all_text = []
cues = []
timeline = []
frame_cursor = 0
FPS = 30

for number, scene in enumerate(scenes,1):
    paragraph = paragraphs[scene['paragraph']]
    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
    selected = sentences[scene.get('start_sentence',0):scene.get('end_sentence',len(sentences))]
    text = ' '.join(selected)
    all_text.append(text)
    frames = max(180, round((len(text.split())/2.4 + 0.8)*FPS))
    if number == 1:
        frames = max(240,frames)
    if number == len(scenes):
        frames += 30
    duration = frames/FPS
    start = frame_cursor/FPS
    frame_cursor += frames
    local_cursor = 0.35
    chunks = caption_chunks(text, 81 if scene.get("layout") == "portrait" else 91)
    word_count = len(text.split())
    local = []
    for chunk in chunks:
        cue_duration = (duration-0.7)*len(chunk.split())/word_count
        line = '\n'.join(textwrap.wrap(chunk,width=43 if scene.get("layout") == "portrait" else 49,break_long_words=False,break_on_hyphens=False))
        if len(line.splitlines()) > 2:
            raise ValueError(f'Caption exceeds two lines: {line}')
        cue = {'start':start+local_cursor,'end':start+local_cursor+cue_duration,'text':line}
        cues.append(cue)
        local.append({'start':local_cursor,'end':local_cursor+cue_duration,'text':line})
        local_cursor += cue_duration
    scene.update(number=number,frames=frames,duration=duration,start=start,text=text,cues=local)
    timeline.append({k:scene[k] for k in ['number','title','start','duration','text']})

if ' '.join(' '.join(all_text).split()) != ' '.join(verbatim.split()):
    raise ValueError('Storyboard must cover the entire verbatim narration exactly once, in order.')

srt = ''.join(f'{i}\n{srt_time(c["start"])} --> {srt_time(c["end"])}\n{c["text"]}\n\n' for i,c in enumerate(cues,1))
(output/'looplight-walkthrough.srt').write_text(srt)
(output/'walkthrough-timeline.json').write_text(json.dumps({'duration':frame_cursor/FPS,'fps':FPS,'scenes':timeline},indent=2)+'\n')

ASS_HEADER = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans,40,&H00FFFFFF,&H00FFFFFF,&H00102238,&H00102238,0,0,0,0,100,100,0,0,1,0,0,2,100,100,74,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
for scene in scenes:
    scene_dir = work / f'scene-{scene["number"]:02}'
    scene_dir.mkdir(exist_ok=True)
    scene['directory'] = scene_dir
    (scene_dir/'title.txt').write_text('\n'.join(textwrap.wrap(scene['title'],width=43)) if scene.get('layout') == 'portrait' else scene['title'])
    if scene.get('keyline'):
        (scene_dir/'keyline.txt').write_text(scene['keyline'])
    (scene_dir/'label.txt').write_text('SCREENSHOT WALKTHROUGH  /  FICTIONAL DATA')
    (scene_dir/'brand.txt').write_text('LOOPLIGHT')
    (scene_dir/'footer.txt').write_text('Shivam Gupta  /  Built with AI-assisted development')
    ass = ASS_HEADER.replace(',2,100,100,74,1', ',2,72,920,105,1') if scene.get('layout') == 'portrait' else ASS_HEADER
    for cue in scene['cues']:
        value = cue['text'].replace('\n',r'\N')
        ass += f'Dialogue: 0,{ass_time(cue["start"])},{ass_time(cue["end"])},Caption,,0,0,0,,{value}\n'
    (scene_dir/'captions.ass').write_text(ass)
    if scene.get('card'):
        (scene_dir/'card.txt').write_text(scene['card'])
        (scene_dir/'card_note.txt').write_text(scene.get('card_note',''))

print(f'Prepared {len(scenes)} scenes and {len(cues)} subtitle cues for {frame_cursor/FPS:.3f}s.',flush=True)
if args.prepare_only:
    raise SystemExit(0)
ffmpeg = executable()
font_dir = args.font_dir
if font_dir is None:
    raise SystemExit('Pass --font-dir or set LOOPLIGHT_FONT_DIR to the Noto Sans font directory.')
font_dir = font_dir.expanduser().resolve()
font = font_dir/'NotoSans-Regular.ttf'
bold = font_dir/'NotoSans-Bold.ttf'
for item in [font,bold]:
    if not item.is_file():
        raise ValueError(f'Missing font: {item}')
filters = run([ffmpeg,'-hide_banner','-filters'],'ffmpeg-filters.log').stdout
for required in ['drawtext',' ass ','overlay','crop','scale']:
    if required not in filters:
        raise ValueError(f'FFmpeg lacks required filter {required}')
source_hashes = {}

def draw(file,size,color,x,y,bold_face=False):
    return f"drawtext=fontfile='{ffpath(bold if bold_face else font)}':textfile='{ffpath(file)}':fontcolor={color}:fontsize={size}:line_spacing=16:expansion=none:x={x}:y={y}"

for scene in scenes:
    if args.scene_preview and scene['number'] != args.scene_preview:
        continue
    d=scene['directory']
    duration=scene['duration']
    target=d/'clip.mp4'
    common=[ffmpeg,'-hide_banner','-loglevel','warning','-y']
    if scene.get('image'):
        screenshot=root/'assets'/scene['image']
        if not screenshot.is_file():
            raise FileNotFoundError(f'Awaiting screenshot: {screenshot}')
        source_hashes[str(screenshot.relative_to(root))]=hashlib.sha256(screenshot.read_bytes()).hexdigest()
        common+=['-loop','1','-framerate',str(FPS),'-i',str(screenshot)]
        crop=scene.get('crop')
        image_filters=[]
        if crop:
            if scene.get('crop_reason') not in ['blank edges only','native dialog bounds']:
                raise ValueError('Every crop must identify blank edges or exact native dialog bounds.')
            x,y,w,h=crop
            image_filters.append(f'crop={w}:{h}:{x}:{y}')
        if scene.get('layout') == 'portrait':
            image_filters+=['scale=700:860:force_original_aspect_ratio=decrease:flags=lanczos','setsar=1','pad=1920:1080:1848-iw:150:color=0x102238']
        else:
            image_filters+=['scale=1776:706:force_original_aspect_ratio=decrease:flags=lanczos','setsar=1','pad=1920:1080:(ow-iw)/2:160:color=0x102238']
    else:
        common+=['-f','lavfi','-i',f'color=c=0x102238:s=1920x1080:r={FPS}:d={duration}']
        image_filters=[]
    image_filters += [
        draw(d/'brand.txt',29,'0xc7f578',72,35,True),
        draw(d/'label.txt',23,'0xdce4ef','w-tw-72',42),
        draw(d/'title.txt',43,'white',72,96,True),
    ]
    if scene.get('keyline'):
        image_filters += [draw(d/'keyline.txt',58,'0xc7f578',72,368,True)]
    if scene.get('card'):
        image_filters += [draw(d/'card.txt',74,'0xc7f578',110,265,True),draw(d/'card_note.txt',35,'white',110,590)]
    image_filters += [
        draw(d/'footer.txt',21,'0xdce4ef',72,1034),
        f"ass='{ffpath(d/'captions.ass')}':fontsdir='{ffpath(font_dir)}'",
        'fade=t=in:st=0:d=0.20',
        f'fade=t=out:st={duration-0.2:.6f}:d=0.20',
        'format=yuv420p',
    ]
    common += ['-vf',','.join(image_filters),'-frames:v',str(scene['frames']),'-an','-c:v','libx264','-preset','fast','-tune','stillimage','-crf','18','-r',str(FPS),'-movflags','+faststart',str(target)]
    print(f'Rendering {scene["number"]:02}/{len(scenes)}: {scene["title"]}',flush=True)
    run(common,f'scene-{scene["number"]:02}.log')

if args.scene_preview:
    print(f'Preview rendered under {work}.',flush=True)
    raise SystemExit(0)

concat=work/'concat.txt'
concat.write_text(''.join("file '"+str((s['directory']/'clip.mp4').resolve()).replace("'", "'\\''")+"'\n" for s in scenes))
video=output/'looplight-screenshot-walkthrough.mp4'
run([ffmpeg,'-hide_banner','-loglevel','warning','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(video)],'concat.log')

# Verify the encoded file can decode from beginning to end.
verification=run([ffmpeg,'-hide_banner','-i',str(video),'-map','0:v:0','-f','null','-'],'decode-verification.log')
info=verification.stderr
if '1920x1080' not in info or '30 fps' not in info:
    raise ValueError('Encoded output did not report expected 1920x1080 / 30 fps.')
duration_match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',info)
if not duration_match:
    raise ValueError('Could not inspect encoded duration.')
h,m,s=duration_match.groups()
observed=int(h)*3600+int(m)*60+float(s)
expected=frame_cursor/FPS
if abs(observed-expected)>0.1:
    raise ValueError(f'Duration mismatch: {observed} vs {expected}')
if re.search(r'Stream #[^\n]+Audio:',info):
    raise ValueError('Silent walkthrough unexpectedly has an audio stream.')
qa=root/'qa'/'video'
qa.mkdir(parents=True,exist_ok=True)
for scene in scenes:
    point=scene['start']+scene['duration']/2
    run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(point),'-i',str(video),'-frames:v','1',str(qa/f'scene-{scene["number"]:02}.png')],f'frame-{scene["number"]:02}.log')
report={'video':video.name,'resolution':[1920,1080],'fps':FPS,'duration_seconds':observed,'expected_duration_seconds':expected,'audio_stream':False,'decoded_without_error':True,'scene_count':len(scenes),'caption_count':len(cues),'source_sha256':source_hashes,'video_sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'visual_qa':'Frames extracted for human inspection; structural checks do not replace visual review.'}
(output/'walkthrough-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'Created {video} ({observed:.2f}s). Inspect every frame in {qa} before delivery.',flush=True)
