#!/usr/bin/env python3
"""Outside review of a render by google/gemini-3.8-flash (watches picture + audio).
  gemini_review.py VIDEO.mp4 [--from=S --dur=D] [--focus="..."] [--out=docs/reviews/x.md]
The clip is cut to <= 60 s, downscaled to 480x270 at ~380 kb/s with a burned-in song-time strip, mono AAC 64k."""
import base64, json, os, subprocess, sys, tempfile, time
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'gen')); import cf
a = [x for x in sys.argv[1:] if not x.startswith('--')]
o = {x[2:].split('=')[0]: x.split('=', 1)[1] for x in sys.argv[1:] if x.startswith('--') and '=' in x}
src = a[0]; s0 = float(o.get('from', 0)); dur = float(o.get('dur', 60)); off = float(o.get('songoffset', s0))
tmp = tempfile.mktemp(suffix='.mp4')
vf = (f"scale=480:270,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:text='%{{pts\\:hms\\:{off}}}':x=6:y=6:fontsize=12:fontcolor=yellow:box=1:boxcolor=black@0.6")
r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s0), '-t', str(dur), '-i', src, '-vf', vf, '-c:v', 'libx264', '-b:v', '380k', '-preset', 'veryfast',
                    '-c:a', 'aac', '-ac', '1', '-b:a', '64k', tmp])
if r.returncode != 0:  # drawtext missing: plain
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s0), '-t', str(dur), '-i', src, '-vf', 'scale=480:270', '-c:v', 'libx264', '-b:v', '380k', '-c:a', 'aac', '-ac', '1', '-b:a', '64k', tmp], check=True)
b64 = base64.b64encode(open(tmp, 'rb').read()).decode()
brief = open(os.path.join(ROOT, 'docs', 'TREATMENT.md')).read()[:6000]
prompt = f"""You are a demanding music-video director and a San Francisco tech-Twitter power user reviewing a cut of "Hold Fire" (song by Jade Wang with Claude).
Treatment (for intent):\n{brief}\n
The clip covers song time {off:.1f}s to {off + dur:.1f}s (the yellow strip shows song time). Every frame is drawn by JavaScript; the look is "engraved light" (gold line engraving on black), the AI is a constellation, the alien is bioluminescent stipple.
{o.get('focus', '')}
Score 1-10 each: hook/scroll-stopping power, lyric legibility (on a phone, muted), cut rhythm vs the music, lip sync, story clarity, visual polish, originality (not AI slop).
Then list the 8 most important concrete problems, each with a timestamp (song time, s) and a specific fix. Then list any broken frames (black, glitch, placeholder text, type over faces). No praise padding."""
t0 = time.time()
res = cf.run_model('google/gemini-3.8-flash', {'contents': [{'role': 'user', 'parts': [{'inline_data': {'mime_type': 'video/mp4', 'data': b64}}, {'text': prompt}]}]}, timeout=120, retries=1)
def texts(x):
    if isinstance(x, dict):
        if isinstance(x.get('text'), str) and 'thoughtSignature' not in x or (isinstance(x.get('text'), str) and x.get('text')):
            yield x['text']
        for v in x.values(): yield from texts(v)
    elif isinstance(x, list):
        for v in x: yield from texts(v)
txt = ''.join(t for t in texts(res) if isinstance(t, str))
out = o.get('out')
if out:
    os.makedirs(os.path.dirname(os.path.join(ROOT, out)), exist_ok=True)
    open(os.path.join(ROOT, out), 'w').write(f"# Gemini review of {os.path.basename(src)} ({off:.1f}-{off + dur:.1f}s), {time.strftime('%Y-%m-%d %H:%M')}\n\n{txt}\n")
print(txt)
print(f"\n[{time.time() - t0:.1f}s]", file=sys.stderr)
os.unlink(tmp)
