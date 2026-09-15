"""Assemble real app captures with narration and captions timed from real audio.

Only Python's standard library and FFmpeg are required. No API or credentials.
Supported audio: one file per caption, or scene audio with explicit cue timing.
Supported visuals: video, timestamped interaction frames, screenshot, or card.
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
import wave

RATE = 48000
WIDTH, HEIGHT = 1920, 1080


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def quote_filter(path):
    return str(path).replace('\\', '\\\\').replace(':', '\\:').replace("'", "'\\''")


def timestamp(seconds, ass=False):
    units = round(seconds * (100 if ass else 1000))
    base = 100 if ass else 1000
    hours, units = divmod(units, 3600 * base)
    minutes, units = divmod(units, 60 * base)
    seconds, fraction = divmod(units, base)
    return f'{hours}:{minutes:02}:{seconds:02}.{fraction:02}' if ass else f'{hours:02}:{minutes:02}:{seconds:02},{fraction:03}'


def write_wave(path, raw):
    with wave.open(str(path), 'wb') as out:
        out.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        out.writeframes(raw)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG_BIN'))
    parser.add_argument('--font-dir', type=Path, default=os.environ.get('LOOPLIGHT_FONT_DIR'))
    parser.add_argument('--prepare-only', action='store_true', help='Measure audio and emit exact timings; do not render video.')
    args = parser.parse_args()
    root = args.root.resolve()
    manifest_path = args.manifest or root / 'scene-plan.json'
    story = json.loads(manifest_path.read_text())
    require('\u2014' not in manifest_path.read_text(), 'Use plain punctuation; em dashes are not allowed.')
    require(story.get('resolution', [WIDTH, HEIGHT]) == [WIDTH, HEIGHT], 'This layout requires 1920 x 1080.')
    fps = story.get('fps', 30)
    require(fps == 30, 'This workflow uses 30 fps.')
    ffmpeg = args.ffmpeg or shutil.which('ffmpeg')
    require(ffmpeg, 'Pass --ffmpeg or set FFMPEG_BIN.')
    font_dir = args.font_dir.resolve() if args.font_dir else None
    work, output = root / '.build', root / 'output'
    work.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    source_hashes = {str(manifest_path): sha(manifest_path)}
    tool_calls = 0

    def run(command, name):
        nonlocal tool_calls
        tool_calls += 1
        proc = subprocess.run([str(x) for x in command], capture_output=True, text=True)
        (work / f'{tool_calls:03}-{name}.log').write_text(proc.stdout + proc.stderr)
        require(proc.returncode == 0 and 'Stray %' not in proc.stderr,
                f'{name} failed: {proc.stderr[-2500:]}')
        return proc

    def source_path(value):
        path = Path(value)
        path = path if path.is_absolute() else root / path
        path = path.resolve()
        require(path.is_file(), f'Missing input: {path}')
        source_hashes[str(path)] = sha(path)
        return path

    def decode_audio(path, target):
        run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', path,
             '-vn', '-ac', '1', '-ar', str(RATE), '-c:a', 'pcm_s16le', target], 'decode-audio')
        with wave.open(str(target), 'rb') as inp:
            require(inp.getframerate() == RATE and inp.getnchannels() == 1 and inp.getsampwidth() == 2,
                    'Decoded audio format mismatch.')
            raw = inp.readframes(inp.getnframes())
        require(len(raw) > 0, f'Audio is empty: {path}')
        return raw

    scenes = story['scenes']
    require(scenes, 'No scenes in manifest.')
    require(len({s['id'] for s in scenes}) == len(scenes), 'Duplicate scene ids.')
    global_cues, timeline, all_pcm = [], [], []
    frame_cursor = 0
    cue_ids = set()
    for scene in scenes:
        sid = scene['id']
        require(re.fullmatch(r'[A-Za-z0-9_-]+', sid), f'Invalid scene id: {sid}')
        scene_dir = work / sid
        scene_dir.mkdir(exist_ok=True)
        scene['_dir'] = scene_dir
        lead = round(scene.get('lead_seconds', 0.12) * RATE)
        gap = round(scene.get('cue_gap_seconds', 0.06) * RATE)
        tail = round(scene.get('tail_seconds', 0.22) * RATE)
        require(min(lead, gap, tail) >= 0, 'Silence durations must be nonnegative.')
        captions = scene['captions']
        require(captions, f'No captions in scene {sid}.')
        for cue in captions:
            require(cue['id'] not in cue_ids, f'Duplicate caption id: {cue["id"]}')
            cue_ids.add(cue['id'])
            require(cue['text'].strip(), 'Empty caption.')
            require(not any(c in cue['text'] for c in ['{', '}', '\\', '\n']), 'Caption contains ASS control characters.')
        audio = scene['audio']
        local_cues = []
        if audio['mode'] == 'cues':
            items = audio['items']
            require([i['cue_id'] for i in items] == [c['id'] for c in captions], 'Audio caption order mismatch.')
            pieces = [b'\0\0' * lead]
            samples = lead
            for index, (cue, item) in enumerate(zip(captions, items)):
                raw = decode_audio(source_path(item['path']), scene_dir / f'audio-{index:02}.wav')
                count = len(raw) // 2
                local_cues.append({'id': cue['id'], 'text': cue['text'],
                                   'start': samples / RATE, 'end': (samples + count) / RATE})
                pieces.append(raw)
                samples += count
                if index < len(items) - 1:
                    pieces.append(b'\0\0' * gap)
                    samples += gap
            pieces.append(b'\0\0' * tail)
            raw = b''.join(pieces)
        elif audio['mode'] == 'aligned':
            raw_voice = decode_audio(source_path(audio['path']), scene_dir / 'scene-voice.wav')
            voice_duration = len(raw_voice) / (2 * RATE)
            timings = json.loads(source_path(audio['timings_path']).read_text())['cues']
            require([i['cue_id'] for i in timings] == [c['id'] for c in captions], 'Aligned cue order mismatch.')
            last_end = 0
            for cue, timing in zip(captions, timings):
                start, end = timing['start'], timing['end']
                require(0 <= start < end <= voice_duration + 0.02, f'Aligned cue outside audio: {cue["id"]}')
                require(start >= last_end - 0.01, 'Aligned captions overlap.')
                require(' '.join(timing['text'].split()) == ' '.join(cue['text'].split()), 'Alignment transcript differs from narration.')
                local_cues.append({'id': cue['id'], 'text': cue['text'],
                                   'start': start + lead / RATE, 'end': end + lead / RATE})
                last_end = end
            raw = b'\0\0' * lead + raw_voice + b'\0\0' * tail
        else:
            raise ValueError('Audio mode must be cues or aligned; estimated timing is not accepted.')
        frames = math.ceil(len(raw) / (2 * RATE) * fps)
        desired_samples = frames * RATE // fps
        raw += b'\0\0' * (desired_samples - len(raw) // 2)
        duration = frames / fps
        start = frame_cursor / fps
        frame_cursor += frames
        scene.update(_duration=duration, _frames=frames, _cues=local_cues)
        all_pcm.append(raw)
        for cue in local_cues:
            lines = textwrap.wrap(cue['text'], width=60, break_long_words=False, break_on_hyphens=False)
            require(len(lines) <= 2, f'Caption needs splitting before voice generation: {cue["id"]}')
            cue['lines'] = '\n'.join(lines)
            global_cues.append({**cue, 'start': start + cue['start'], 'end': start + cue['end']})
        timeline.append({'id': sid, 'title': scene['title'], 'start': start, 'duration': duration,
                         'frames': frames, 'audio_mode': audio['mode'], 'caption_count': len(local_cues),
                         'media_type': scene['media']['type']})
    total_duration = frame_cursor / fps
    write_wave(work / 'narration-pcm.wav', b''.join(all_pcm))
    (output / 'captions.srt').write_text(''.join(
        f'{index}\n{timestamp(c["start"])} --> {timestamp(c["end"])}\n{c["lines"]}\n\n'
        for index, c in enumerate(global_cues, 1)))
    (output / 'timeline.json').write_text(json.dumps({'duration_seconds': total_duration,
        'timing_basis': 'Decoded audio samples, or supplied alignment within decoded scene audio. No word-count estimates.',
        'scenes': timeline, 'cues': global_cues}, indent=2) + '\n')
    print(f'Measured {total_duration:.3f}s of audio for {len(scenes)} scenes and {len(global_cues)} captions.', flush=True)
    if args.prepare_only:
        return
    require(font_dir is not None, 'Pass --font-dir or set LOOPLIGHT_FONT_DIR.')
    normal, bold = font_dir / 'NotoSans-Regular.ttf', font_dir / 'NotoSans-Bold.ttf'
    require(normal.is_file() and bold.is_file(), 'Noto Sans regular and bold fonts are required.')

    def draw(path, size, color, x, y, is_bold=False):
        return f"drawtext=fontfile='{quote_filter(bold if is_bold else normal)}':textfile='{quote_filter(path)}':fontsize={size}:fontcolor={color}:expansion=none:x={x}:y={y}:line_spacing=14"

    for scene in scenes:
        d, media = scene['_dir'], scene['media']
        duration = scene['_duration']
        args_video = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y']
        kind = media['type']
        speed = float(media.get('speed', 1))
        require(0.5 <= speed <= 2.0, 'Playback speed must be 0.5 to 2.0.')
        if kind == 'video':
            args_video += ['-ss', str(media.get('trim_start', 0)), '-i', source_path(media['path'])]
            label = 'Recorded interactions'
        elif kind == 'frames':
            frames = media['frames']
            require(len(frames) >= 2 and frames[0]['at'] == 0, 'Interaction frames need at least two captures starting at 0.')
            concat_lines = []
            for index, item in enumerate(frames):
                path = source_path(item['path'])
                next_at = frames[index + 1]['at'] if index + 1 < len(frames) else item['at'] + 1
                require(next_at > item['at'], 'Frame capture timestamps must increase.')
                concat_lines += ["file '" + str(path).replace("'", "'\\''") + "'", f'duration {next_at-item["at"]:.6f}']
            concat_lines += [concat_lines[-2]]
            frame_list = d / 'frames.txt'
            frame_list.write_text('\n'.join(concat_lines) + '\n')
            args_video += ['-f', 'concat', '-safe', '0', '-i', frame_list]
            label = 'Recorded interaction frames'
        elif kind == 'image':
            args_video += ['-loop', '1', '-framerate', str(fps), '-i', source_path(media['path'])]
            label = 'Screenshot'
        elif kind == 'card':
            args_video += ['-f', 'lavfi', '-i', f'color=c=0x102238:s={WIDTH}x{HEIGHT}:r={fps}:d={duration}']
            label = 'Pricing hypothesis' if 'price' in media.get('headline', '').lower() or '$' in media.get('headline', '') else 'Project context'
        else:
            raise ValueError(f'Unsupported media type: {kind}')
        if speed != 1:
            label += f' / {speed:g}x playback'
        filters = [f'setpts=(PTS-STARTPTS)/{speed:g}']
        if 'trim_seconds' in media:
            require(media['trim_seconds'] > 0, 'Trim duration must be positive.')
            filters += [f'trim=duration={media["trim_seconds"]}']
        if media.get('crop'):
            require(media.get('crop_reason') in ['native dialog bounds', 'viewport focus', 'blank edges only'], 'Document every crop reason.')
            x, y, w, h = media['crop']
            require(all(isinstance(v, int) for v in [x, y, w, h]) and min(x, y) >= 0 and min(w, h) > 0, 'Invalid crop rectangle.')
            filters += [f'crop={w}:{h}:{x}:{y}']
        filters += [f'fps={fps}', f'tpad=stop_mode=clone:stop_duration={duration}', f'trim=duration={duration}',
                    'scale=1840:790:force_original_aspect_ratio=decrease:flags=lanczos', 'setsar=1',
                    'pad=1920:1080:(ow-iw)/2:90:color=0x102238']
        (d / 'brand.txt').write_text('LOOPLIGHT')
        (d / 'disclosure.txt').write_text('Fictional demo / AI-generated narration')
        (d / 'footer.txt').write_text(f'Shivam Gupta / {label}')
        filters += [draw(d / 'brand.txt', 27, '0xc7f578', 40, 27, True),
                    draw(d / 'disclosure.txt', 23, '0xdce4ef', 'w-tw-40', 29),
                    draw(d / 'footer.txt', 20, '0xdce4ef', 40, 1040)]
        if kind == 'card':
            (d / 'headline.txt').write_text('\n'.join(textwrap.wrap(media['headline'], width=38)))
            (d / 'body.txt').write_text(media.get('body', ''))
            filters += [draw(d / 'headline.txt', 68, '0xc7f578', 110, 280, True),
                        draw(d / 'body.txt', 35, 'white', 110, 530)]
        ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans,40,&H00FFFFFF,&H00FFFFFF,&H00102238,&H00102238,0,0,0,0,100,100,0,0,1,0,0,2,110,110,108,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
        for cue in scene['_cues']:
            line = cue['lines'].replace('\n', r'\N')
            ass += f'Dialogue: 0,{timestamp(cue["start"], True)},{timestamp(cue["end"], True)},Caption,,0,0,0,,{line}\n'
        (d / 'captions.ass').write_text(ass)
        filters += [f"ass='{quote_filter(d/'captions.ass')}':fontsdir='{quote_filter(font_dir)}'", 'format=yuv420p']
        run(args_video + ['-vf', ','.join(filters), '-frames:v', str(scene['_frames']), '-an', '-c:v', 'libx264',
                         '-preset', 'fast', '-crf', '18', '-r', str(fps), '-movflags', '+faststart', d / 'scene.mp4'], 'render-scene')
        print(f'Rendered scene {scene["id"]}.', flush=True)
    concat = work / 'clips.txt'
    concat.write_text(''.join("file '" + str((s['_dir'] / 'scene.mp4').resolve()).replace("'", "'\\''") + "'\n" for s in scenes))
    run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat,
         '-c', 'copy', work / 'visuals.mp4'], 'join-video')
    # Measure the actual narration before a second-pass loudness normalization.
    measure = run([ffmpeg, '-hide_banner', '-i', work / 'narration-pcm.wav', '-af',
                   'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], 'measure-loudness')
    match = re.search(r'\{\s*"input_i"[\s\S]+?\}', measure.stderr)
    require(match is not None, 'Loudness measurement was not returned.')
    loud = json.loads(match.group())
    require(all(math.isfinite(float(loud[k])) for k in ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']),
            'Narration is silent or cannot be normalized.')
    norm = (f'loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={loud["input_i"]}:'
            f'measured_TP={loud["input_tp"]}:measured_LRA={loud["input_lra"]}:'
            f'measured_thresh={loud["input_thresh"]}:offset={loud["target_offset"]}:linear=true:print_format=json')
    final = output / 'looplight-narrated-demo.mp4'
    run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', work / 'visuals.mp4', '-i', work / 'narration-pcm.wav',
         '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', norm, '-ar', str(RATE), '-c:a', 'aac', '-b:a', '192k',
         '-t', str(total_duration), '-movflags', '+faststart', final], 'mux-final')
    decode = run([ffmpeg, '-hide_banner', '-i', final, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], 'verify-final')
    require('1920x1080' in decode.stderr and '30 fps' in decode.stderr and 'Audio: aac' in decode.stderr,
            'Final streams do not match the delivery contract.')
    observed_match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', decode.stderr)
    require(observed_match, 'Final duration unavailable.')
    h, m, s = observed_match.groups()
    observed = int(h) * 3600 + int(m) * 60 + float(s)
    require(abs(observed - total_duration) <= 0.10, 'Final duration differs from audio-derived timeline.')
    qa = output / 'qa'
    qa.mkdir(exist_ok=True)
    for scene in timeline:
        point = scene['start'] + scene['duration'] / 2
        run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(point), '-i', final,
             '-frames:v', '1', qa / f'scene-{scene["id"]}.png'], 'extract-qa')
    report = {'resolution': [WIDTH, HEIGHT], 'fps': fps, 'duration_seconds': observed,
              'narration_words': sum(len(c['text'].split()) for c in global_cues),
              'captions': len(global_cues), 'caption_timing': 'actual audio; see timeline.json',
              'audio': {'codec': 'AAC', 'sample_rate': RATE, 'normalization': 'two-pass EBU R128 target -16 LUFS / -1.5 dBTP'},
              'decoded_complete_video_and_audio': True, 'source_sha256': source_hashes, 'video_sha256': sha(final),
              'visual_qa': 'Midpoint frames extracted. Review them and listen to the final video before release.',
              'claim_boundary': 'Encoding and timing checks do not verify product behavior or narration accuracy.'}
    (output / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Created {final}. Review the frames and listen before release.', flush=True)


if __name__ == '__main__':
    main()
