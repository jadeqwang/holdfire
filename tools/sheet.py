#!/usr/bin/env python3
"""Contact sheet: sheet.py OUT.jpg img1 img2 ... [--cols=3] [--w=640]"""
import sys
from PIL import Image, ImageDraw
args=[a for a in sys.argv[1:] if not a.startswith('--')]; opt={a[2:].split('=')[0]:a.split('=')[1] for a in sys.argv[1:] if a.startswith('--')}
out, ims = args[0], args[1:]
cols=int(opt.get('cols',3)); W=int(opt.get('w',640))
tiles=[]
for p in ims:
    im=Image.open(p).convert('RGB'); h=int(W*im.size[1]/im.size[0]); im=im.resize((W,h)); d=ImageDraw.Draw(im); d.text((6,4),p.split('/')[-1],fill=(255,255,0)); tiles.append(im)
h=max(t.size[1] for t in tiles); rows=(len(tiles)+cols-1)//cols
sheet=Image.new('RGB',(cols*W+(cols-1)*4,rows*h+(rows-1)*4),(40,40,40))
for i,t in enumerate(tiles): sheet.paste(t,((i%cols)*(W+4),(i//cols)*(h+4)))
sheet.save(out,quality=88); print(out, sheet.size)
