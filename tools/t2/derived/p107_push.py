"""p107_push.py TAKE.mp4 OUT.mp4 [--t0 0.3]: 2.5 s, 24 fps, 1920x1080 push into the near eye (gen space; the pick flips it),
eye tracked by template matching; crossfades into the 2K eye still media/kf2/P107_eye_nbp_v1_2k.jpg, which equals the
keyframe crop centred (572,358)/1376 (w 200 px) = scale 6.88 of the 1080p frame."""
import cv2, numpy as np, sys, subprocess, os
take, out = sys.argv[1], sys.argv[2]; t0 = float(sys.argv[sys.argv.index('--t0')+1]) if '--t0' in sys.argv else 0.3
cap = cv2.VideoCapture(take); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(cv2.resize(f, (1920, 1080), interpolation=cv2.INTER_LANCZOS4) if f.shape[1] != 1920 else f)
i0 = int(round(t0*24)); fr = fr[i0:i0+60]; assert len(fr) == 60, len(fr)
E0 = np.array([572, 358]) * 1920/1376.          # eye centre in the keyframe, 1080p px
ZE = 1920/(200*1920/1376.)                       # 6.88
still = cv2.imread('/home/user/holdfire/media/kf2/P107_eye_nbp_v1_2k.jpg')
# track the eye: template from frame 0 around E0
g0 = cv2.cvtColor(fr[0], cv2.COLOR_BGR2GRAY); x, y = int(E0[0]), int(E0[1]); tpl = g0[y-50:y+50, x-80:x+80]
eyes = []
for f in fr:
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY); win = g[y-110:y+110, x-140:x+140]
    r = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(r)
    eyes.append(E0 + np.array([ml[0]-60, ml[1]-60]))
eyes = np.array(eyes); k = np.ones(5)/5; eyes = np.stack([np.convolve(np.pad(eyes[:, j], 2, mode='edge'), k, 'valid') for j in range(2)], 1)
print('eye drift px', np.round(eyes[[0, 30, 59]] - E0, 1).tolist())
os.makedirs(out + '_f', exist_ok=True)
T1 = 1.92
for i, f in enumerate(fr):
    s = min(1.0, (i/24)/T1); z = ZE ** (s**2)
    e = eyes[i]; c = np.array([960, 540]) * (1 - s**1.5) + e * (s**1.5)  # where the eye ends at frame centre
    # affine: screen = (p - c) * z + (960,540)  -> sample source at p = (q - 960,540)/z + c
    M = np.array([[z, 0, 960 - c[0]*z], [0, z, 540 - c[1]*z]])
    img = cv2.warpAffine(f, M, (1920, 1080), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    a = np.clip((s - 0.62)/0.33, 0, 1); a = a*a*(3 - 2*a)
    if a > 0:
        ss = z/ZE                                  # still scale on screen (1 = fills the frame)
        # still pixel (u,v) in 1920-wide still space maps to keyframe-eye-space; its centre sits on the eye e
        sw = 1920*ss; sh = 1080*ss; cx = 960 + (e[0]-c[0])*z; cy = 540 + (e[1]-c[1])*z
        Ms = np.array([[sw/still.shape[1], 0, cx - sw/2], [0, sh/still.shape[0], cy - sh/2]])
        st = cv2.warpAffine(still, Ms, (1920, 1080), flags=cv2.INTER_AREA if ss < 1 else cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
        m = np.zeros((1080, 1920), np.float32)
        x0, y0 = cx - sw/2, cy - sh/2; fe = 0.18*min(sw, sh)
        yy, xx = np.mgrid[0:1080, 0:1920].astype(np.float32)
        dx = np.minimum(xx - x0, x0 + sw - xx); dy = np.minimum(yy - y0, y0 + sh - yy)
        m = np.clip(np.minimum(dx, dy)/fe, 0, 1) if ss < 0.999 else np.ones_like(m)
        m = (m*a)[..., None]
        img = (img*(1-m) + st*m).astype(np.uint8)
    cv2.imwrite(f'{out}_f/f_{i:04d}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 95])
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', f'{out}_f/f_%04d.jpg', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', out], check=True)
print(out)
