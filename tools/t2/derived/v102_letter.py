import cv2, numpy as np, glob, os
from PIL import Image, ImageDraw, ImageFont
D='/home/user/holdfire/work/t2/mirror/v102'; fs=sorted(glob.glob(D+'/f_*.jpg'))
F='/usr/share/fonts/opentype/inter/Inter-Bold.otf'; K=8
x0,y0,x1,y1=216,521,322,539          # text box in frame 1 (1280x720)
# text alpha tile
W,H=x1-x0,y1-y0; t=Image.new('L',(W*K,H*K),0); d=ImageDraw.Draw(t); s=10
while True:
    f=ImageFont.truetype(F,s); bb=d.textbbox((0,0),'RARE EARTH',font=f)
    if bb[2]-bb[0]>W*K*0.98 or bb[3]-bb[1]>H*K*0.72: s-=1; break
    s+=1
f=ImageFont.truetype(F,s); bb=d.textbbox((0,0),'RARE EARTH',font=f)
d.text(((W*K-(bb[2]-bb[0]))//2-bb[0],(H*K-(bb[3]-bb[1]))//2-bb[1]),'RARE EARTH',font=f,fill=255)
A=np.asarray(t.resize((W,H),Image.LANCZOS)).astype(float)/255
g0=cv2.cvtColor(cv2.imread(fs[0]),cv2.COLOR_BGR2GRAY); tx0,ty0,tx1,ty1=330,425,480,525; tpl=g0[ty0:ty1,tx0:tx1]
os.makedirs(D+'_out',exist_ok=True); track=[]
for i,fp in enumerate(fs):
    im=cv2.imread(fp); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    sx0,sy0=tx0-40,ty0-40; win=g[sy0:ty1+40,sx0:tx1+40]
    r=cv2.matchTemplate(win,tpl,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(r)
    dx,dy=ml[0]+sx0-tx0, ml[1]+sy0-ty0; track.append((dx,dy,round(mv,3)))
    X0,Y0=x0+dx,y0+dy; reg=im[Y0:Y0+H,X0:X0+W].astype(float)
    L=reg.mean(2)/255; jacket=np.clip((L-0.36)/0.08,0,1)*np.clip(1-(reg.max(2)-reg.min(2))/255/0.45,0,1)   # bright, low-chroma cloth (not hair)
    a=np.clip(A*1.25,0,1)*jacket*0.95
    ink=np.array([38,34,30],float)
    reg=reg*(1-a[...,None])+ink*a[...,None]
    im[Y0:Y0+H,X0:X0+W]=reg.clip(0,255).astype(np.uint8)
    cv2.imwrite(D+'_out/'+os.path.basename(fp),im,[cv2.IMWRITE_JPEG_QUALITY,95])
print(track[::10])
