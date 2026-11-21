from PIL import Image, ImageDraw
import random
from sprite import CHAR
PAL32={
'O':(27,22,38),'wall':(232,220,196),'wallS':(210,194,162),'wallD':(176,156,124),
'woodL':(192,132,84),'wood':(150,96,58),'woodD':(110,67,41),'deep':(70,44,32),
'floorL':(220,174,120),'sky':(134,204,240),'skyL':(196,232,248),'sea':(58,138,204),'seaD':(42,106,168),
'white':(246,242,232),'cream':(236,222,186),'red':(204,74,60),'redD':(150,50,44),
'blue':(62,110,180),'navy':(44,68,126),'navyD':(30,40,80),'green':(90,158,90),'greenD':(58,110,68),
'yellow':(232,184,74),'yellowD':(180,136,52),'pink':(224,140,156),'teal':(62,162,154),'purple':(138,92,160),
'orange':(224,122,58),'grey':(140,140,152),'greyD':(98,98,110),'skin':(244,202,162),'skinD':(224,160,128)}
assert len(PAL32)==32
K=PAL32
BOOKS=[('red','redD'),('blue','navy'),('green','greenD'),('yellow','yellowD'),('cream','wallD'),('navy','navyD'),
 ('pink','redD'),('teal','greenD'),('orange','redD'),('purple','navyD'),('grey','greyD'),('white','wallS')]
# 방 테마: 벽·바닥·천장 무늬와 그림자 색. 키는 모두 PAL32 이름.
# 'deep'(책장 뒷판색)은 프로토타입이 책을 꽂는 자리 표시라 테마 색으로 쓰면 안 된다.
ATTIC=dict(wall=None,wallk=['wall','wallS','wallD','white'],side=['wallS','wallS','wallD','wallS'],
           floor=None,floork=['woodL','wood','woodD','floorL'],ceil='wood',beam='woodD',base='wallD',sh1='wallD',sh2='wallS')
class Scene:
    def __init__(s,W,H,vp,FY,seed=1,theme=None):
        s.W,s.H,s.vp,s.FY=W,H,vp,FY
        s.T=dict(ATTIC,**(theme or {}))
        for k,v in s.T.items():
            if isinstance(v,str) and k!='name': assert v!='deep' and v in K,(k,v)
            if isinstance(v,list): assert 'deep' not in v,(k,v)
        s.im=Image.new('RGB',(W,H),K[s.T['wallk'][0]]);s.d=ImageDraw.Draw(s.im);s.r=random.Random(seed);s.books=0
        s.nobooks=False;s.slots=[];s.bragslots=[];s.foot=None
    def P(s,x,y,c):
        if 0<=x<s.W and 0<=y<s.H: s.im.putpixel((int(x),int(y)),K[c])
    def R(s,x0,y0,x1,y1,c):
        if x1>x0 and y1>y0: s.d.rectangle([x0,y0,x1-1,y1-1],fill=K[c])
    def box(s,x0,y0,x1,y1,c): s.R(x0,y0,x1,y1,'O');s.R(x0+1,y0+1,x1-1,y1-1,c)
    def poly(s,pts,c,ol=True):
        s.d.polygon(pts,fill=K[c])
        if ol: s.d.line(pts+[pts[0]],fill=K['O'])
    def line(s,a,b,c='O'): s.d.line([a,b],fill=K[c])
    def toward(s,p,k): return (p[0]+(s.vp[0]-p[0])*k, p[1]+(s.vp[1]-p[1])*k)
    # ---------- room shell ----------
    def wall_key(s,x,y):
        """뒷벽 (x,y) 픽셀의 테마 색 키. 테마 무늬가 없으면 기본 다이아 점무늬."""
        T=s.T;x0,y0=x-s.bx0,y-s.by0
        if T['wall'] is None:
            dot=6<=y0 and y<s.FY-8 and x<s.bx1-3 and (y0-6)%10==0 and x0>=5 and (x0-5-((y//10)%2)*5)%10==0
            return T['wallk'][1] if dot else T['wallk'][0]
        return T['wallk'][T['wall'](x0,y0,7)]
    def shell(s,bx0,by0,bx1,ceil=None):
        W,H,FY=s.W,s.H,s.FY;vx,vy=s.vp;T=s.T
        s.bx0,s.by0,s.bx1=bx0,by0,bx1
        def out(p,edge_x):  # extend from VP through p to x=edge_x
            t=(edge_x-vx)/(p[0]-vx);return (edge_x, vy+(p[1]-vy)*t)
        px=s.im.load();C=lambda k:K[k]
        # floor
        if T['floor'] is None:   # 기본: 소실점으로 모이는 널판
            s.R(0,FY,W,H,T['floork'][0])
            xs=list(range(bx0-14*40,bx1+14*40,14))
            for xb in xs:
                xe=xb+(xb-vx)*(H-FY)/(FY-vy)
                s.line((xb,FY),(xe,H),T['floork'][1])
            ys=[FY];y=FY;g=6
            while y<H: y+=g;g=int(g*1.25)+1;ys.append(y)
            for y in ys: s.R(0,y,W,y+1,T['floork'][1])
        else:                    # 테마 무늬를 원근으로 바닥에 깐다
            D0=2*(FY-vy);fk=[C(k) for k in T['floork']]
            for y in range(FY,H):
                q=(FY-vy)/(y-vy+1e-9);v=int(D0*(1-q))
                for x in range(W):
                    u=int(vx+(x-vx)*q)+400
                    px[x,y]=fk[T['floor'](u,v,3)]
        # back wall pattern
        for y in range(by0,FY):
            for x in range(bx0,bx1): px[x,y]=C(s.wall_key(x,y))
        # side walls
        lt=out((bx0,by0),0);lb=out((bx0,FY),0);rt=out((bx1,by0),W);rb=out((bx1,FY),W)
        s.poly([(0,lt[1]),(bx0,by0),(bx0,FY),(0,lb[1])],T['side'][0],False)
        s.poly([(W,rt[1]),(bx1,by0),(bx1,FY),(W,rb[1])],T['side'][0],False)
        if T['wall'] is not None:   # 옆벽에도 같은 무늬(뒷벽 높이로 환산해 원근을 맞춤)
            sk=[C(k) for k in T['side']];side0=C(T['side'][0])
            for x in list(range(0,bx0))+list(range(bx1,W)):
                xb=bx0 if x<bx0 else bx1-1;f=(xb-vx)/(x-vx)
                for y in range(H):
                    if px[x,y]!=side0: continue
                    Y=vy+(y-vy)*f
                    if by0<=Y<FY: px[x,y]=sk[T['wall'](int(abs(x-xb)*1.5),int(Y-by0),7)]
        s.line((bx0,by0),(bx0,FY));s.line((bx1,by0),(bx1,FY));s.line((bx0,FY),lb);s.line((bx1,FY),rb)
        # baseboard
        s.R(bx0,FY-4,bx1,FY,T['base']);s.R(bx0,FY-1,bx1,FY,'O')
        # ceiling
        s.poly([(0,0),(W,0),(W,rt[1]),(bx1,by0),(bx0,by0),(0,lt[1])],ceil or T['ceil'],False)
        s.R(bx0,by0-1,bx1,by0,'O');s.line((0,lt[1]),(bx0,by0));s.line((W,rt[1]),(bx1,by0))
        for x in range(bx0+10,bx1-4,24): s.R(x,1,x+1,by0-1,T['beam'])
        s.lt,s.lb,s.rt,s.rb=lt,lb,rt,rb
    # ---------- shelf with depth ----------
    def shelf(s,x0,y0,x1,rows,dep=6,inner=True):
        FY=s.FY;y1=FY+dep;vx,vy=s.vp
        k=dep/(y1-vy)
        bl=s.toward((x0,y1),k);br=s.toward((x1,y1),k);tl=s.toward((x0,y0),k);tr=s.toward((x1,y0),k)
        if x1<vx: tr=(max(tr[0],x1+5),tr[1]);br=(max(br[0],x1+5),br[1])
        if x0>vx: tl=(min(tl[0],x0-5),tl[1]);bl=(min(bl[0],x0-5),bl[1])
        # cast shadow on wall (away from light/center) + floor contact
        sh1,sh2=s.T['sh1'],s.T['sh2']
        if x1<vx: s.R(x0-5,y0+4,x0,FY,sh1);s.R(x0-7,y0+6,x0-5,FY,sh2)
        if x0>vx: s.R(x1,y0+4,x1+5,FY,sh1);s.R(x1+5,y0+6,x1+7,FY,sh2)
        s.poly([(x0-2,y1),(x1+2,y1),(x1+2+3,y1+3),(x0-2-3,y1+3)],'wood',False)
        s.R(x0-3,y1,x1+3,y1+3,'wood')
        # side panel
        if x1<vx: s.poly([(x1,y0),tr,br,(x1,y1)],'woodD')
        if x0>vx: s.poly([(x0,y0),tl,bl,(x0,y1)],'woodD')
        # top face
        if y0>vy: s.poly([(x0,y0),tl,tr,(x1,y0)],'woodL')
        # front frame
        s.box(x0,y0,x1,y1,'wood');s.R(x0+1,y0+1,x1-1,y0+2,'woodL')
        s.R(x0+4,y0+4,x1-4,y1-7,'deep')
        for yb in rows:
            s.R(x0+4,yb,x1-4,yb+3,'wood');s.R(x0+4,yb,x1-4,yb+1,'woodL');s.R(x0+4,yb+3,x1-4,yb+4,'O')
        # inner shadows: under boards and on side facing away from light
        tops=[y0+4]+[yb+4 for yb in rows]
        for t in tops: s.R(x0+4,t,x1-4,t+1,'O')
        if inner:
            if x1<vx: s.R(x0+4,y0+4,x0+6,y1-7,'O')
            elif x0>vx: s.R(x1-6,y0+4,x1-4,y1-7,'O')
        s.R(x0+3,y0+3,x0+4,y1-6,'O');s.R(x1-4,y0+3,x1-3,y1-6,'O');s.R(x0+3,y0+3,x1-3,y0+4,'O')
        s.R(x0+1,y1-7,x1-1,y1-1,'woodD');s.R(x0+1,y1-7,x1-1,y1-6,'O')
        return [y0+4]+[yb+4 for yb in rows], y1-7
    # ---------- books ----------
    def spine(s,x,yb,w,h,col,lean=0,eb=False):
        c,sh=col
        for i in range(h):
            y=yb-1-i;o=(i*lean)//6
            s.R(x+o,y,x+o+w,y+1,c);s.P(x+o+w-1,y,sh);s.P(x+o,y,'O')
        o=(h*lean)//6;s.R(x+o,yb-h-1,x+o+w,yb-h,'O')
        if w>=3 and not lean:
            mx=x+w//2
            for i in range(4,min(h-4,4+s.r.randint(3,8))):
                if s.r.random()<0.7: s.P(mx,yb-h+i,'white' if c not in('white','cream','yellow') else 'greyD')
        if s.r.random()<0.4 and h>10: s.R(x+1,yb-h+2,x+w-1,yb-h+3,sh)
        if s.r.random()<0.4 and h>12: s.R(x+1,yb-4,x+w-1,yb-3,sh)
        s.books+=1
    def fill(s,x0,x1,yb,maxh,seed,dense=False):
        if s.nobooks: s.slots.append([int(x0),int(x1),int(yb),int(maxh)]);return
        r=random.Random(seed);x=x0
        while x<x1-2:
            t=r.random()
            if t<0.06 and x<x1-14 and not dense:
                n=r.randint(2,4);yy=yb
                for _ in range(n):
                    w=r.randint(9,13);hh=r.randint(3,4);c,sh=r.choice(BOOKS)
                    s.R(x,yy-hh,x+w,yy,c);s.R(x,yy-1,x+w,yy,sh);s.R(x,yy-hh-1,x+w,yy-hh,'O');s.R(x,yy-hh,x+1,yy,'O');s.R(x+w,yy-hh,x+w+1,yy,'O')
                    yy-=hh+1;s.books+=1
                x+=14;continue
            if t<(0.04 if dense else 0.11): x+=r.randint(2,4);continue
            w=r.randint(2,4) if dense else r.randint(2,5);h=r.randint(max(9,maxh-7),maxh);col=r.choice(BOOKS)
            if x+w>=x1-1: break
            lean=1 if (t<(0.1 if dense else 0.15) and x+w+4<x1) else 0
            s.spine(x,yb,w,h,col,lean);x+=w+(2 if lean else 1)
    def cover(s,x0,yb,col,pat,cw=16,ch=21):
        y0=yb-ch;c,sh=col
        s.box(x0,y0,x0+cw,yb,c)
        if pat=='circle': s.d.ellipse([x0+4,y0+8,x0+cw-5,y0+15],fill=K['white'])
        if pat=='band': s.R(x0+1,y0+12,x0+cw-1,y0+16,'yellow')
        if pat=='split': s.d.polygon([(x0+cw-2,y0+2),(x0+cw-2,yb-2),(x0+2,yb-2)],fill=K['white'])
        if pat=='stripe':
            for xx in range(x0+2,x0+cw-1,3): s.R(xx,y0+9,xx+1,yb-2,sh)
        tc='O' if pat=='split' or c in('white','cream','yellow') else 'white'
        s.R(x0+3,y0+3,x0+cw-5,y0+5,tc);s.R(x0+3,y0+6,x0+cw-8,y0+7,tc)
        s.R(x0+cw-1,y0+1,x0+cw,yb-1,sh)
    # ---------- character ----------
    def character(s,cx,foot,book=True):
        PALC={'O':'O','E':'O','H':'wood','h':'woodD','L':'woodL','S':'skin','s':'skinD','B':'pink','N':'navy','n':'navyD',
              'C':'white','c':'wallS','P':'grey','p':'greyD','K':'O','w':'white'}
        rows=[list(r) for r in CHAR]
        if book:   # hands brought in front holding a book
            for y in (34,35):
                for x in range(len(rows[y])):
                    if rows[y][x] in 'Ss': rows[y][x]='N'
        Wc=max(len(r) for r in rows);x0=cx-Wc//2;y0=foot-len(rows)
        for y,r in enumerate(rows):
            for x,ch in enumerate(r):
                if ch!='.': s.P(x0+x,y0+y,PALC[ch])
        if book:
            bx,by=x0+8,y0+29
            s.box(bx,by,bx+10,by+9,'red');s.R(bx+1,by+1,bx+9,by+2,'white');s.R(bx+4,by+3,bx+6,by+8,'redD')
            for hx in (bx-1,bx+9): s.R(hx,by+5,hx+2,by+8,'skin');s.P(hx if hx<bx else hx+1,by+5,'O')
    def quantize(s):
        pal=list(K.values());px=s.im.load()
        cache={}
        for y in range(s.H):
            for x in range(s.W):
                c=px[x,y]
                if c not in cache: cache[c]=min(pal,key=lambda p:sum((a-b)**2 for a,b in zip(c,p)))
                px[x,y]=cache[c]
    def save(s,name,scale):
        s.quantize()
        s.im.save(name+'_native.png');s.im.resize((s.W*scale,s.H*scale),Image.NEAREST).save(name+'_x%d.png'%scale)
        print(name,'colors',len(s.im.getcolors(1000)),'books',s.books)

# ===== v3 additions =====
def _sidey(s,x,Y,side):
    vx,vy=s.vp;xb=s.bx0 if side=='L' else s.bx1-1
    return vy+(Y-vy)*(x-vx)/(xb-vx)
Scene.sidey=_sidey
def side_quad(s,side,x_a,x_b,Ya,Yb,c,ol=True):
    pts=[(x_a,s.sidey(x_a,Ya,side)),(x_b,s.sidey(x_b,Ya,side)),(x_b,s.sidey(x_b,Yb,side)),(x_a,s.sidey(x_a,Yb,side))]
    s.poly(pts,c,ol);return pts
Scene.side_quad=side_quad
def side_window(s,side,x_a,x_b,Ya,Yb,night=False):
    s.side_quad(side,x_a,x_b,Ya-3,Yb+3,'wood')
    s.side_quad(side,x_a+(2 if side=='L' else -2),x_b+(-2 if side=='L' else 2),Ya,Yb,'sky' if not night else 'navyD')
    for x in range(min(x_a,x_b)+2,max(x_a,x_b)-1):
        y0=s.sidey(x,Ya,side);y1=s.sidey(x,Yb,side)
        for yy in range(int(y0)+1,int(y0+(y1-y0)*0.35)): s.P(x,yy,'skyL') if (yy+x)%3==0 else None
    xm=(x_a+x_b)//2;s.line((xm,s.sidey(xm,Ya,side)),(xm,s.sidey(xm,Yb,side)),'wood')
    s.line((x_a,s.sidey(x_a,(Ya+Yb)/2,side)),(x_b,s.sidey(x_b,(Ya+Yb)/2,side)),'wood')
Scene.side_window=side_window
def side_shelf(s,side,x_front,Ytop,Ybot,rowsY,seed):
    import random
    r=random.Random(seed)
    xb=s.bx0 if side=='L' else s.bx1-1
    xs=range(xb-1,x_front,-1) if side=='L' else range(xb+1,x_front)
    # carcass
    for x in xs:
        y0=s.sidey(x,Ytop,side);y1=s.sidey(x,Ybot,side)
        s.R(x,int(y0),x+1,int(y1)+1,'deep')
        for Yb in rowsY+[Ybot]:
            yb=s.sidey(x,Yb,side);t=max(2,int(3*(x-s.vp[0])/(xb-s.vp[0])))
            s.R(x,int(yb),x+1,int(yb)+t,'wood');s.P(x,int(yb),'woodL');s.P(x,int(yb)+t,'O')
        s.P(x,int(y0),'O');s.P(x,int(y0)+1,'wood');s.P(x,int(y1)+1,'O')
    # books per row
    for i,Yb in enumerate(rowsY+[Ybot]):
        Ytopr=(rowsY[i-1] if i>0 else Ytop)+4
        cur=None;rem=0
        for x in xs:
            sc=(x-s.vp[0])/(xb-s.vp[0])
            if rem<=0:
                if r.random()<0.08: cur=None;rem=r.randint(2,4);
                else: cur=(r.choice(BOOKS),r.randint(min(12,int(Yb-Ytopr)-2),max(min(12,int(Yb-Ytopr)-2),min(18,int(Yb-Ytopr)-1))));rem=r.randint(2,5);s.books+=1
                first=True
            else: first=False
            rem-=1/sc
            if cur is None: continue
            (c,sh),h=cur
            ya=s.sidey(x,Yb-h,side);yb=s.sidey(x,Yb,side)
            s.R(x,int(ya),x+1,int(yb),sh if rem<=0 else c)
            if first: s.R(x,int(ya),x+1,int(yb),'O')
            s.P(x,int(ya)-1,'O')
    # front edge post
    yf0=s.sidey(x_front,Ytop,side);yf1=s.sidey(x_front,Ybot,side)
    s.R(min(x_front,x_front+(3 if side=='L' else -3)),int(yf0),max(x_front,x_front+(3 if side=='L' else -3))+1,int(yf1)+4,'wood')
    s.line((x_front,yf0),(x_front,yf1+4))
Scene.side_shelf=side_shelf
def avatar_draw(s,cx,foot,pose='read'):
    from avatar import make
    a=make(pose=pose);px=a.load()
    x0=cx-a.width//2;y0=foot-a.height
    for y in range(a.height):
        for x in range(a.width):
            p=px[x,y]
            if p[3]: s.im.putpixel((x0+x,y0+y),p[:3])
Scene.avatar=avatar_draw
def avatar7_draw(s,cx,foot,sex='m',hair=None,outfit='basic'):
    if s.nobooks:
        if s.foot is None: s.foot=[cx,foot]
        return
    from avatar9 import make
    a=make(hair or ('m_basic' if sex=='m' else 'f_bob'),outfit,hood='s' if outfit=='hoodie' else None);px=a.load()
    x0=cx-a.width//2;y0=foot-a.height
    for y in range(a.height):
        for x in range(a.width):
            p=px[x,y]
            if p[3]: s.im.putpixel((x0+x,y0+y),p[:3])
Scene.avatar7=avatar7_draw
