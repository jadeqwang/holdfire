#!/usr/bin/env python3
"""Face landmarks for a plate (MediaPipe FaceMesh, refine_landmarks): per frame, the feature contours the renderer draws
(lips outer/inner, eyes, irises, brows, nose, face oval), in 1920x1080 design px.  Run with the mediapipe venv:
  $MP312/bin/python tools/roto/face.py SRC OUT.json [--start=S] [--dur=D]
OUT: {fps, start, frames:[null | {lipsO:[[x,y]..], lipsI, eyeL, eyeR, irisL:[x,y,r], irisR, browL, browR, nose, oval, open}]}"""
import json, sys
import cv2, numpy as np
import mediapipe as mp

a = [x for x in sys.argv[1:] if not x.startswith('--')]
o = {x[2:].split('=')[0]: x.split('=', 1)[1] for x in sys.argv[1:] if x.startswith('--')}
src, out = a[0], a[1]
start = float(o.get('start', 0)); dur = float(o.get('dur', 0))
FM = mp.solutions.face_mesh

def ring(conns):
    """order an edge set (pairs) into a closed loop of indices"""
    adj = {}
    for u, v in conns: adj.setdefault(u, []).append(v); adj.setdefault(v, []).append(u)
    s = next(iter(adj)); loop = [s]; prev = None; cur = s
    while True:
        nxt = [n for n in adj[cur] if n != prev]
        if not nxt or nxt[0] == s: break
        prev, cur = cur, nxt[0]; loop.append(cur)
        if len(loop) > 200: break
    return loop

LIPS = list(FM.FACEMESH_LIPS)
outer_idx = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
inner_idx = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]
eyeL = ring(FM.FACEMESH_LEFT_EYE); eyeR = ring(FM.FACEMESH_RIGHT_EYE)
browL = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336]; browR = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107]
oval = ring(FM.FACEMESH_FACE_OVAL)
nose = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2]
nostril = [98, 97, 2, 326, 327]

cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS) or 24
n0 = int(round(start * fps)); n1 = n0 + int(round(dur * fps)) if dur else int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
cap.set(cv2.CAP_PROP_POS_FRAMES, n0)
res = {'fps': fps, 'start': start, 'frames': []}
with FM.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.4, min_tracking_confidence=0.4) as fm:
    i = n0
    while i < n1:
        ok, im = cap.read()
        if not ok: break
        h, w = im.shape[:2]
        r = fm.process(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
        if not r.multi_face_landmarks:
            res['frames'].append(None); i += 1; continue
        L = r.multi_face_landmarks[0].landmark
        P = np.array([[p.x * 1920, p.y * 1080] for p in L])
        pick = lambda idx: np.round(P[idx], 1).tolist()
        def iris(c):
            pts = P[c]; cen = pts.mean(0); rr = float(np.linalg.norm(pts - cen, axis=1).mean()); return [round(cen[0], 1), round(cen[1], 1), round(rr, 2)]
        face_h = np.linalg.norm(P[10] - P[152])
        res['frames'].append({'lipsO': pick(outer_idx), 'lipsI': pick(inner_idx), 'eyeL': pick(eyeL), 'eyeR': pick(eyeR),
                              'irisL': iris([474, 475, 476, 477]), 'irisR': iris([469, 470, 471, 472]), 'browL': pick(browL), 'browR': pick(browR),
                              'nose': pick(nose), 'nostril': pick(nostril), 'oval': pick(oval),
                              'open': round(float(np.linalg.norm(P[13] - P[14]) / max(face_h, 1)), 4), 'faceH': round(float(face_h), 1)})
        i += 1
json.dump(res, open(out, 'w'))
found = sum(1 for f in res['frames'] if f)
print(f"{found}/{len(res['frames'])} frames with a face -> {out}")
