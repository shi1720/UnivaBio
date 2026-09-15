"""Convert actual Chrome Page.screencastFrame captures at their recorded timing.

Requires FFmpeg and standard Python only. Frames stay unchanged. Timestamp
intervals are preserved before sampling at 30 fps; the final captured image is
held through the capture's reported elapsed time. No cursor is synthesized.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import math
from pathlib import Path
import subprocess


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ffquote(path):
    return "'" + str(path).replace("'", "'\\''") + "'"


def convert(source, output, ffmpeg, fps):
    data = json.loads(source.read_text())
    assert data.get('source') == 'Chrome DevTools Page.screencastFrame', 'Unrecognized capture provenance.'
    frames = data['frames']
    assert len(frames) >= 2, 'At least two captured frames are required.'
    times = [float(f['metadata']['timestamp']) for f in frames]
    assert all(abs(float(f['at'])-t) < 0.000001 for f, t in zip(frames, times)), 'Capture timestamps disagree.'
    assert all(y > x for x, y in zip(times, times[1:])), 'Timestamps must be strictly increasing.'
    elapsed = float(data['elapsed'])
    span = times[-1]-times[0]
    assert elapsed >= span > 0, 'Elapsed capture time cannot end before its final frame.'
    output.parent.mkdir(parents=True, exist_ok=True)
    work = output.parent / '.cdp-conversion' / source.parent.name
    work.mkdir(parents=True, exist_ok=True)
    lines = ['ffconcat version 1.0']
    hashes = []
    for index, frame in enumerate(frames):
        path = (source.parent / frame['file']).resolve()
        assert path.is_file() and path.parent == source.parent.resolve(), 'Invalid frame path.'
        duration = times[index+1]-times[index] if index+1 < len(frames) else elapsed-span
        assert duration >= 0
        # Image demuxer timestamps use microseconds instead of the 25 fps default.
        lines += ['file '+ffquote(path), 'option framerate 1000000', f'duration {duration:.9f}']
        hashes.append({'file':frame['file'],'timestamp':times[index],'sha256':sha(path)})
    lines += ['file '+ffquote((source.parent/frames[-1]['file']).resolve()), 'option framerate 1000000']
    concat = work/'frames.ffconcat'
    concat.write_text('\n'.join(lines)+'\n')
    count = math.ceil(elapsed*fps)
    command = [ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),
               '-vf',f'fps={fps},tpad=stop_mode=clone:stop_duration=1,format=yuv420p',
               '-frames:v',str(count),'-an','-c:v','libx264','-preset','fast','-crf','16',
               '-r',str(fps),'-movflags','+faststart',str(output)]
    proc = subprocess.run(command,capture_output=True,text=True)
    (work/'conversion.log').write_text(proc.stdout+proc.stderr)
    assert proc.returncode == 0, proc.stderr[-2000:]
    report = {'input':str(source),'source_url':data['url'],'input_manifest_sha256':sha(source),
              'output':str(output),'output_sha256':sha(output),'captured_frames':len(frames),
              'capture_elapsed_seconds':elapsed,'first_to_last_frame_seconds':span,
              'final_hold_seconds':elapsed-span,'output_frames':count,'output_duration_seconds':count/fps,
              'timestamp_basis':'Original absolute Page.screencastFrame metadata timestamps, normalized to first frame. Original differences preserved to microsecond demuxer precision, then sampled at 30 fps.',
              'playback_speed':1,'synthetic_cursor':False,'original_frame_hashes':hashes}
    (work/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    return {k:v for k,v in report.items() if k!='original_frame_hashes'}


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--root',type=Path,required=True,help='Demo package containing captures/raw-XX/frames.json.')
    p.add_argument('--ffmpeg',required=True)
    p.add_argument('--fps',type=int,default=30,choices=[30])
    p.add_argument('--jobs',type=int,default=2)
    a=p.parse_args();root=a.root.resolve();sources=sorted((root/'captures').glob('raw-*/frames.json'))
    assert sources,'No raw captures found.'
    def one(source):
        sid=source.parent.name.removeprefix('raw-')
        assert sid.isdigit()
        result=convert(source,root/'captures'/f'scene-{sid}.mp4',a.ffmpeg,a.fps)
        print(json.dumps({'scene':sid,'duration':result['output_duration_seconds'],'capture_frames':result['captured_frames']}),flush=True)
        return result
    with ThreadPoolExecutor(max_workers=max(1,a.jobs)) as pool:
        reports=list(pool.map(one,sources))
    (root/'captures/cdp-conversion-report.json').write_text(json.dumps({'scenes':reports,'capture_count':len(reports)},indent=2)+'\n')


if __name__=='__main__':
    main()
