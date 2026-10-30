#!/usr/bin/env python3
"""letter.py IN OUT --text x0,y0,x1,y1 [--patch cx,cy,r] [--bg r,g,b]: paint clean RARE EARTH (fit to box) / a 1420 MHz patch."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
a=sys.argv; im=Image.open(a[1]).convert('RGB'); out=a[2]
opts={a[i][2:]:a[i+1] for i in range(3,len(a)-1) if a[i].startswith('--')}
F='/usr/share/fonts/opentype/inter/Inter-Bold.otf'
K=8
def sample_bg(box):
    x0,y0,x1,y1=box; arr=np.asarray(im.crop((x0-2,y0-3,x1+2,y1+3))).reshape(-1,3).astype(float)
    l=arr.sum(1); return tuple(int(v) for v in np.median(arr[l>np.percentile(l,60)],0))
if 'text' in opts:
    x0,y0,x1,y1=map(int,opts['text'].split(',')); w,h=x1-x0,y1-y0
    bg=tuple(map(int,opts['bg'].split(','))) if 'bg' in opts else sample_bg((x0,y0,x1,y1))
    pad=3
    tile=Image.new('RGB',((w+2*pad)*K,(h+2*pad)*K),bg); d=ImageDraw.Draw(tile)
    txt=opts.get('word','RARE EARTH')
    fs=10
    while True:
        f=ImageFont.truetype(F,fs); bb=d.textbbox((0,0),txt,font=f)
        if bb[2]-bb[0]>w*K or bb[3]-bb[1]>h*K: fs-=1; break
        fs+=1
    f=ImageFont.truetype(F,fs); bb=d.textbbox((0,0),txt,font=f)
    tx=(tile.width-(bb[2]-bb[0]))//2-bb[0]; ty=(tile.height-(bb[3]-bb[1]))//2-bb[1]
    d.text((tx,ty),txt,font=f,fill=(30,32,38))
    t=tile.resize((w+2*pad,h+2*pad),Image.LANCZOS)
    m=Image.new('L',t.size,0); ImageDraw.Draw(m).rectangle([1,1,t.width-2,t.height-2],fill=255); m=m.filter(ImageFilter.GaussianBlur(1))
    im.paste(t,(x0-pad,y0-pad),m)
if 'patch' in opts:
    cx,cy,r=map(float,opts['patch'].split(',')); R=int(r*K); S=2*R+8*K
    tile=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(tile); c=S//2
    d.ellipse([c-R,c-R,c+R,c+R],fill=(22,22,26,255)); r2=int(R*0.82); d.ellipse([c-r2,c-r2,c+r2,c+r2],fill=(236,238,240,255))
    f=ImageFont.truetype(F,int(R*0.52))
    for s,dy in (('1420',-0.27),('MHz',0.27)):
        bb=d.textbbox((0,0),s,font=f); d.text((c-(bb[2]-bb[0])/2-bb[0], c+dy*R-(bb[3]-bb[1])/2-bb[1]),s,font=f,fill=(20,20,24,255))
    sz=S//K; t=tile.resize((sz,sz),Image.LANCZOS)
    tint=opts.get('tint')
    if tint:
        tr,tg,tb=map(float,tint.split(',')); arr=np.asarray(t).astype(float); arr[...,0]*=tr; arr[...,1]*=tg; arr[...,2]*=tb; t=Image.fromarray(arr.clip(0,255).astype('uint8'),'RGBA')
    im.paste(t,(int(cx-sz/2),int(cy-sz/2)),t)
im.save(out,quality=92); print(out)
