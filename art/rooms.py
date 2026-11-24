# 빈 방(구조) + 아이템 레이어 + 대표 책 테마(벽·바닥·창밖 풍경) 렌더러
from lib import Scene, BOOKS, K
from scenes import plant, floorlamp, pendant, rug, mug, brag
import windows, materials
from PIL import Image, ImageDraw
import json, base64, io, os, random

SENT=(255,0,255)   # 팔레트에 없는 표시색: 창 유리 자리, 아이템 레이어 추출에 쓴다

# ---------- 대표 책 테마 ----------
# 프로토타입 장르 4종(lit/sf/manga/hum)에 맞춘 테마. 색은 모두 PAL32 키, 'deep'은 쓰지 않는다.
M=materials
THEMES={
 'attic':dict(name='다락방',genre='lit',scene='바다'),   # 기본(지금까지의 방)
 'space':dict(name='우주정거장',genre='sf',scene='우주',
   wall=M.panel,wallk=['grey','grey','greyD','teal'],side=['greyD','greyD','navyD','teal'],
   floor=M.tile,floork=['greyD','greyD','grey','teal'],ceil='navyD',beam='navy',base='navyD',sh1='greyD',sh2='greyD'),
 'manga':dict(name='만화방',genre='manga',scene='도시',
   wall=M.dots,wallk=['cream','pink','wallS','white'],side=['wallS','pink','wallD','cream'],
   floor=M.check,floork=['white','wallS','wallD','white'],ceil='red',beam='redD',base='redD',sh1='wallD',sh2='wallS'),
 'study':dict(name='서고',genre='hum',scene='숲',
   wall=lambda x,y,s:1 if x%8==0 else 0,wallk=['greenD','green','greenD','green'],side=['greenD','green','greenD','green'],
   floor=M.hplank,floork=['wood','woodD','woodD','woodL'],ceil='woodD',beam='O',base='woodD',sh1='navyD',sh2='greenD'),
}
TODS=['새벽','낮','노을','밤']
PAL=list(K.values())
SKYPAL=[K[k] for k in ('navyD','navy','blue','sky','skyL','white','purple','pink','orange','yellow','red','redD','O','sea','cream')]
def spec(key):
    return {k:v for k,v in THEMES[key].items() if k not in('name','genre','scene')}

# ---------- 3D helpers ----------
def box3d(s,x0,y0,w,h,d,top,front,side):
    """front face (x0,y0,w,h); top & side faces recede toward vanishing point."""
    vx,vy=s.vp;cx=x0+w/2
    dx=int(round((vx-cx)*d/ max(40,(y0+h-vy))))  # horizontal shift of back edge
    pts_top=[(x0,y0),(x0+w-1,y0),(x0+w-1+dx,y0-d),(x0+dx,y0-d)]
    if dx>0: s.poly([(x0+w-1,y0),(x0+w-1+dx,y0-d),(x0+w-1+dx,y0+h-1-d),(x0+w-1,y0+h-1)],side)
    elif dx<0: s.poly([(x0,y0),(x0+dx,y0-d),(x0+dx,y0+h-1-d),(x0,y0+h-1)],side)
    s.poly(pts_top,top)
    s.box(x0,y0,x0+w,y0+h,front)
def shadow(s,x0,x1,y):
    for x in range(x0,x1):
        if (x+y)%2==0: s.P(x,y,'O')
def armchair(s,x,yb,col='teal',hi='green'):
    shadow(s,x-6,x+42,yb+1)
    box3d(s,x+2,yb-34,32,18,6,hi,col,'greenD')          # backrest
    box3d(s,x-4,yb-16,44,16,10,hi,col,'greenD')         # seat
    box3d(s,x-7,yb-22,9,22,8,hi,col,'greenD')           # left arm
    box3d(s,x+34,yb-22,9,22,8,hi,col,'greenD')          # right arm
    s.R(x+2,yb-14,x+32,yb-12,hi)
def sidetable(s,x,yb):
    shadow(s,x-1,x+18,yb+1)
    box3d(s,x,yb-16,16,3,6,'woodL','wood','woodD')
    s.R(x+2,yb-13,x+4,yb,'O');s.R(x+12,yb-13,x+14,yb,'O')
    mug(s,x+4,yb-26)
def pile(s,x,yb,specs):
    y=yb;shadow(s,x-2,x+max(w for w,_,_ in specs)+4,yb+1)
    for (w,col,dx) in specs:
        c,sh=col
        box3d(s,x+dx,y-4,w,4,4,'white',c,sh)
        s.R(x+dx+1,y-2,x+dx+w-1,y-1,sh)
        y-=5
def globe(s,x,yb):
    shadow(s,x-2,x+20,yb+1)
    s.R(x+5,yb-3,x+13,yb,'O');s.R(x+8,yb-8,x+10,yb-3,'O')
    s.d.ellipse([x,yb-26,x+18,yb-8],fill=K['O']);s.d.ellipse([x+1,yb-25,x+17,yb-9],fill=K['sea'])
    s.R(x+4,yb-21,x+10,yb-16,'green');s.R(x+11,yb-14,x+15,yb-11,'green');s.P(x+4,yb-23,'skyL');s.P(x+5,yb-23,'skyL')
def pot_plant(s,x,yb,big=False):
    shadow(s,x-3,x+(17 if big else 15),yb+1)
    plant(s,x,yb,big)
def valance(s,x0,x1,y):
    s.R(x0-4,y-2,x1+4,y,'woodD');s.R(x0-5,y-2,x0-3,y,'O');s.R(x1+3,y-2,x1+5,y,'O')
    s.R(x0,y,x1,y+8,'red');s.R(x0,y,x1,y+1,'pink')
    for x in range(x0,x1,8):
        s.R(x,y+8,x+6,y+10,'red');s.R(x+6,y+1,x+7,y+10,'redD')
    s.line((x0,y),(x0,y+9));s.line((x1,y),(x1,y+9))
    for x in range(x0,x1,8): s.R(x,y+10,x+6,y+11,'O')
def frame(s,x,y,w,h):
    s.box(x,y,x+w,y+h,'woodL');s.R(x+2,y+2,x+w-2,y+h-2,'skyL');s.R(x+2,y+h-6,x+w-2,y+h-2,'green');s.R(x+w-7,y+4,x+w-4,y+7,'yellow')
def postcard(s,x,y):
    pc=[(x,y+2),(x+15,y),(x+16,y+11),(x+1,y+13)];s.poly(pc,'white');s.R(x+4,y+4,x+12,y+5,'sky');s.R(x+4,y+7,x+10,y+8,'wallD');s.P(x+8,y+1,'red')
def side_frame(s):   # Lv.1 오른쪽 옆벽 액자
    s.side_quad('R',268,282,40,70,'O',False);s.side_quad('R',269,281,42,68,'skyL',False);s.side_quad('R',269,281,60,68,'green',False)
def ladder(s,x0,y0,y1,slope=0.07):
    for t in range(0,y1-y0):
        y=y0+t;x=int(x0+t*slope)
        s.P(x,y,'woodD');s.P(x+1,y,'wood');s.P(x+14,y,'woodD');s.P(x+15,y,'wood')
    for y in range(y0+10,y1-6,14):
        x=int(x0+(y-y0)*slope);s.R(x,y,x+16,y+2,'woodL');s.R(x,y+2,x+16,y+3,'O')
    xe=int(x0+(y1-y0)*slope);s.R(xe-2,y1-2,xe+18,y1+1,'O')
def stairs(s,railing,x0=96,fy=404,top=206,n=14,run=16,w=30):
    """Lv.4 복층 계단: 바닥(fy)에서 복층 바닥(top)까지 이어진 디딤판 + 옆판(스트링거) + 손잡이."""
    rise=(fy-top)/n
    xs=[x0+i*run for i in range(n)];ys=[round(fy-rise*(i+1)) for i in range(n)]
    xt=xs[-1]+w
    # 옆판: 디딤판 앞 아래 모서리를 잇는 띠(바닥~복층 바닥까지 끊김 없이)
    r=round(rise)
    s.poly([(x0,fy),(x0+w,fy),(xt,top+r),(xt,top+r+9),(x0+w+14,fy)],'woodD')
    s.poly([(x0+w,fy-1),(xt,top+r-1),(xt,top+r+2),(x0+w+4,fy-1)],'wood')
    for x,y in zip(xs,ys):
        box3d(s,x,y,w,round(rise),4,'woodL','wood','woodD')
        s.R(x,y,x+w,y+1,'woodL')
    # 손잡이: 아래 기둥 → 기울기 따라 → 위에서 난간과 만남
    hy=34
    s.R(x0+2,fy-hy-4,x0+6,fy,'woodD');s.R(x0+1,fy-hy-6,x0+7,fy-hy-3,'woodL')
    for k in range(0,xt-x0-4):
        x=x0+4+k;y=round(fy-hy-(fy-top)*k/(xt-x0-4))
        s.R(x,y,x+1,y+3,'wood');s.P(x,y,'woodL');s.P(x,y+3,'O')
    for i in range(1,n,2):
        x=xs[i]+4;y=ys[i];yh=round(fy-hy-(fy-top)*(x-x0-4)/(xt-x0-4))
        s.R(x,yh+3,x+2,y,'wood')
    s.R(xt-1,top-hy+1,xt+3,top+1,'woodD');s.R(xt-2,top-hy-2,xt+4,top-hy+1,'woodL')
def rail_ladder(s,rx0,rx1,ry,lx,ly1,slope=0.15,rail=None):
    """Lv.4: 천장 바로 아래 황동 레일에 걸린 이동식 사다리. 발은 복층 난간 뒤에 숨는다."""
    s.R(rx0,ry,rx1,ry+3,'yellowD');s.R(rx0,ry,rx1,ry+1,'yellow');s.R(rx0,ry+3,rx1,ry+4,'O')
    for bx in range(rx0+6,rx1-4,48): s.R(bx,ry-4,bx+3,ry+4,'greyD');s.P(bx+1,ry-4,'grey')
    s.R(rx0-2,ry-1,rx0,ry+5,'O');s.R(rx1,ry-1,rx1+2,ry+5,'O')
    y0=ry+3;ladder(s,lx,y0,ly1,slope)
    for hx in (lx,lx+14):   # 레일에 거는 갈고리
        s.R(hx,ry-2,hx+2,ry+4,'greyD');s.R(hx-1,ry-2,hx+2,ry-1,'O')
    xe=int(lx+(ly1-y0)*slope)
    for wx in (xe,xe+13): s.R(wx-1,ly1-4,wx+4,ly1+1,'greyD');s.P(wx+1,ly1-3,'grey')
    if rail: rail(xe-8,xe+26)
def banker_lamp(s, x, yb):
    """기본 스탠드: 협탁 위 뱅커스 램프(초록 유리 갓, 놋쇠 받침·기둥, 당김줄). 반환: 갓 아래 빛 중심"""
    shadow(s, x - 2, x + 20, yb + 1)
    box3d(s, x, yb - 14, 18, 3, 5, 'wood', 'woodD', 'woodD')               # 협탁 상판(바닥과 구분되게 짙은 나무)
    s.R(x + 2, yb - 11, x + 4, yb, 'O'); s.R(x + 14, yb - 11, x + 16, yb, 'O')   # 다리
    t = yb - 16                                                              # 상판 윗면(앞면 위 2px)
    # 놋쇠 받침(납작한 타원)
    s.R(x + 4, t - 3, x + 14, t, 'O'); s.R(x + 5, t - 2, x + 13, t, 'yellowD'); s.R(x + 5, t - 2, x + 12, t - 1, 'yellow')
    # 기둥: 받침 뒤쪽에서 올라가 갓을 받친다
    s.R(x + 8, t - 10, x + 10, t - 3, 'O'); s.P(x + 9, t - 9, 'yellow'); s.P(x + 9, t - 7, 'yellowD'); s.P(x + 9, t - 5, 'yellow')
    # 초록 유리 갓: 가로로 긴 반원통
    s.R(x + 2, t - 15, x + 16, t - 10, 'O')
    s.R(x + 1, t - 13, x + 17, t - 10, 'O')
    s.R(x + 3, t - 14, x + 15, t - 11, 'green'); s.R(x + 2, t - 12, x + 16, t - 11, 'green')
    s.R(x + 2, t - 11, x + 16, t - 10, 'greenD')                             # 갓 아래 테
    s.R(x + 4, t - 14, x + 9, t - 13, 'white')                               # 유리 반사
    s.R(x + 3, t - 10, x + 15, t - 9, 'yellow')                              # 갓 아래 불빛
    # 당김줄
    s.P(x + 13, t - 9, 'yellowD'); s.P(x + 13, t - 8, 'yellowD'); s.P(x + 13, t - 7, 'yellow')
    return (x + 9, t - 8)
def cushions(s,x,y):
    box3d(s,x,y-10,16,10,4,'white','cream','wallD');box3d(s,x+22,y-9,16,9,4,'pink','pink','redD')

# ---------- 창: 유리 자리를 표시색으로 비워 두고, 테마·시간대 풍경을 따로 끼운다 ----------
def glass(s,box):
    s.glass.append(box)
def win(s,x0,y0,x1,y1,arch=False,lift=0):
    s.box(x0-4,y0-4,x1+4,y1+4,'wood');s.R(x0-3,y1+1,x1+3,y1+3,'woodL')
    s.d.rectangle([x0,y0,x1-1,y1-1],fill=SENT);glass(s,(x0,y0,x1,y1));s.lift[(x0,y0,x1,y1)]=lift
    my=(y0+y1)//2;mx=(x0+x1)//2
    s.R(x0,my,x1,my+2,'wood');s.R(x0,my,x1,my+1,'O');s.R(mx-1,y0,mx+1,y1,'wood');s.R(mx-1,y0,mx,y1,'O')
    if arch:
        px=s.im.load()
        for i in range(10):
            w=int(((10-i)/10)**2*((x1-x0)//2))
            for x in list(range(x0,x0+w))+list(range(x1-w,x1)): px[x,y0+i]=K[s.wall_key(x,y0+i)]
            s.P(x0+w,y0+i,'O');s.P(x1-w-1,y0+i,'O')
def side_win(s,side,x_a,x_b,Ya,Yb):
    s.side_quad(side,x_a,x_b,Ya-3,Yb+3,'wood')
    xa,xb=x_a+(2 if side=='L' else -2),x_b+(-2 if side=='L' else 2)
    pts=[(xa,s.sidey(xa,Ya,side)),(xb,s.sidey(xb,Ya,side)),(xb,s.sidey(xb,Yb,side)),(xa,s.sidey(xa,Yb,side))]
    s.d.polygon(pts,fill=SENT);s.d.line(pts+[pts[0]],fill=K['O'])
    xs=[p[0] for p in pts];ys=[p[1] for p in pts]
    glass(s,(int(min(xs)),int(min(ys)),int(max(xs))+1,int(max(ys))+1))
    xm=(x_a+x_b)//2;s.line((xm,s.sidey(xm,Ya,side)),(xm,s.sidey(xm,Yb,side)),'wood')
    s.line((x_a,s.sidey(x_a,(Ya+Yb)/2,side)),(x_b,s.sidey(x_b,(Ya+Yb)/2,side)),'wood')

ITEMS=[('desklamp',0,'기본 스탠드'),('rug',10,'러그'),('pile',30,'책 더미'),('plant',50,'화분'),('lamp',100,'스탠드 조명'),('deco',150,'액자와 엽서'),
       ('chair',200,'1인 소파와 테이블'),('pendant',300,'샹들리에'),('valance',500,'창 커튼'),('ladder',700,'사다리'),
       ('globe',1000,'지구본'),('cushion',1500,'창가 쿠션')]

# ---------- 꾸미기 선택지(variants.py): 같은 자리에 모양·색만 바꿔 그린다 ----------
import variants
rug,pot_plant,armchair,floorlamp=variants.rug,variants.pot_plant,variants.armchair,variants.floorlamp
# ---------- levels: base structure + item placement ----------
# items: id -> [(그리는 함수, 'wall'|'floor', 바닥 기준 y), ...]  물건 하나당 한 줄(앞뒤 판정 단위)
def W_(f): return (f,'wall',0)
def F_(f,base): return (f,'floor',base)
def mkscene(W,H,vp,FY,seed,theme):
    s=Scene(W,H,vp,FY,seed=seed,theme=spec(theme));s.nobooks=True;s.glass=[];s.lift={};return s
def L1(theme='attic'):
    s=mkscene(288,216,(144,40),140,3,theme)
    s.shell(26,12,262);win(s,120,28,168,82)
    tl,bl=s.shelf(30,20,104,[42,64,86,108],dep=10)
    for i,yb in enumerate([42,64,86,108,bl]): s.fill(36,101,yb,18 if i else 16,10+i)
    tr,br=s.shelf(186,56,258,[82,106],dep=10);brag(s,191,82,3,62)
    s.fill(190,253,106,18,30);s.fill(190,253,br,18,31)
    items={'desklamp':[F_(lambda:banker_lamp(s,100,186),186)],
       'rug':[F_(lambda:rug(s,144,199,56,13),0)],
       'pile':[F_(lambda:pile(s,40,194,[(24,BOOKS[2],0),(20,BOOKS[6],3),(23,BOOKS[9],-1),(17,BOOKS[3],4)]),194)],
       'plant':[W_(lambda:pot_plant(s,240,52))],
       'lamp':[F_(lambda:floorlamp(s,266,122,186),189)],
       'deco':[W_(lambda:postcard(s,108,104)),W_(lambda:side_frame(s))],
       'chair':[F_(lambda:armchair(s,190,198),198),F_(lambda:sidetable(s,240,194),194)],
       'pendant':[W_(lambda:variants.chandelier(s,144,0,9,48))],
       'valance':[W_(lambda:valance(s,120,168,24))],
       'globe':[F_(lambda:globe(s,72,190),190)]}
    return s,items,(144,205)
def L2(theme='attic'):
    s=mkscene(384,288,(192,48),186,8,theme)
    s.shell(26,12,358);win(s,168,30,216,90)
    tl,bl=s.shelf(30,22,104,[44,66,88,110,132,154],dep=10)
    for i,yb in enumerate([44,66,88,110,132,154,bl]): s.fill(36,101,yb,18 if i else 16,40+i)
    r2=[62,84,106,128,150]   # 가운데 두 책장을 한 칸 높여 수용량을 약 300권으로
    t2,b2=s.shelf(110,40,158,r2,dep=10)
    for i,yb in enumerate(r2+[b2]): s.fill(116,155,yb,18,50+i)
    t3,b3=s.shelf(228,40,300,r2,dep=10);brag(s,233,84,3,64)
    for i,yb in enumerate([62,106,128,150,b3]): s.fill(232,297,yb,18,60+i)
    t4,b4=s.shelf(306,22,354,[44,66,88,110,132,154],dep=10)
    for i,yb in enumerate([44,66,88,110,132,154,b4]): s.fill(310,351,yb,18,70+i)
    items={'desklamp':[F_(lambda:banker_lamp(s,110,236),236)],
       'rug':[F_(lambda:rug(s,192,258,86,18),0)],
       'pile':[F_(lambda:pile(s,116,262,[(20,BOOKS[2],0),(18,BOOKS[9],2),(16,BOOKS[0],1)]),262)],
       'plant':[F_(lambda:pot_plant(s,338,276,True),276)],
       'lamp':[F_(lambda:floorlamp(s,320,194,258),261)],
       'deco':[W_(lambda:postcard(s,170,104)),W_(lambda:frame(s,192,104,22,16))],
       'chair':[F_(lambda:armchair(s,40,264),264),F_(lambda:sidetable(s,90,260),260)],
       'pendant':[W_(lambda:variants.chandelier(s,192,0,12,64))],
       'valance':[W_(lambda:valance(s,168,216,26))],
       'globe':[F_(lambda:globe(s,270,262),262)]}
    return s,items,(192,268)
def L3(theme='attic'):
    s=mkscene(512,384,(256,70),268,5,theme)
    s.shell(44,16,468);win(s,232,50,280,176,arch=True)
    rows=[22+22*k for k in range(1,11)]
    tl,bl=s.shelf(50,24,222,rows,dep=16)
    for i,yb in enumerate(rows+[bl]): s.fill(56,219,yb,18,100+i,dense=True)
    tr,br=s.shelf(290,24,462,rows,dep=16)
    for i,yb in enumerate(rows+[br]):
        if yb==rows[5]: brag(s,296,yb,8,yb-21);continue
        s.fill(294,457,yb,18,200+i,dense=True)
    for x0 in (222,280):
        s.box(x0,18,x0+10,268,'woodL');s.R(x0+2,20,x0+4,266,'wood');s.R(x0-1,18,x0+11,24,'wood');s.R(x0-1,262,x0+11,270,'wood')
    s.R(44,16,468,22,'wood');s.R(44,16,468,17,'woodL');s.R(44,22,468,23,'O')
    s.box(232,26,280,42,'wood');s.R(235,29,277,39,'deep');s.fill(236,276,39,10,99,dense=True)
    box3d(s,230,240,52,30,6,'woodL','woodL','wood')   # window seat (architecture)
    rowsY=[74+22*k for k in range(1,9)]
    s.side_shelf('L',8,74,268,rowsY,301);s.side_shelf('R',503,74,268,rowsY,302)
    side_win(s,'L',38,16,28,62);side_win(s,'R',474,496,28,62)
    items={'desklamp':[F_(lambda:banker_lamp(s,174,300),300)],
       'rug':[F_(lambda:rug(s,268,336,132,25),0)],
       'pile':[F_(lambda:pile(s,170,352,[(26,BOOKS[2],0),(22,BOOKS[6],3),(24,BOOKS[9],-1),(18,BOOKS[3],4)]),352),
               F_(lambda:pile(s,392,336,[(24,BOOKS[5],0),(20,BOOKS[7],2),(22,BOOKS[4],-2)]),336)],
       'plant':[F_(lambda:pot_plant(s,452,332,True),332)],
       'lamp':[F_(lambda:floorlamp(s,76,256,320),323)],
       'deco':[W_(lambda:postcard(s,236,182))],
       'chair':[F_(lambda:armchair(s,96,320),320),F_(lambda:sidetable(s,146,318),318)],
       'pendant':[W_(lambda:variants.chandelier(s,256,0,18,92))],
       'valance':[W_(lambda:valance(s,232,280,46))],
       'globe':[F_(lambda:globe(s,412,316),316)],
       'ladder':[W_(lambda:ladder(s,196,30,266))],
       'cushion':[W_(lambda:cushions(s,236,236))]}
    return s,items,(268,341)
def L4(theme='attic'):
    s=mkscene(768,576,(384,96),404,12,theme)
    s.shell(60,18,708)
    FY0=s.FY;s.FY=206
    up=[30+22*k for k in range(1,8)]
    tu,bu=s.shelf(68,28,330,up,dep=8)
    for i,yb in enumerate(up+[bu]): s.fill(74,327,yb,18,300+i,dense=True)
    tv,bv=s.shelf(438,28,700,up,dep=8)
    for i,yb in enumerate(up+[bv]): s.fill(444,697,yb,18,320+i,dense=True)
    s.FY=FY0
    win(s,346,40,422,196,arch=True,lift=14)   # 아래쪽은 복층 난간에 가려짐
    def railing(x0=60,x1=708,gap=None):
        s.R(x0,206,x1,216,'woodL');s.R(x0,214,x1,217,'wood');s.R(x0,217,x1,218,'O');s.R(x0,205,x1,206,'O')
        for a,b in ([(x0,gap[0]),(gap[1],x1)] if gap else [(x0,x1)]):
            s.R(a,184,b,187,'wood');s.R(a,184,b,185,'woodL');s.R(a,187,b,188,'O')
            for x in range(64,708,14):
                if a<=x and x+3<=b: s.R(x,188,x+3,206,'wood');s.R(x+2,188,x+3,206,'woodD')
    railing(gap=(262,336))   # 계단이 올라오는 자리는 난간을 튼다
    lo=[226+22*k for k in range(1,8)]
    tl,bl=s.shelf(68,226,330,lo,dep=14)
    for i,yb in enumerate(lo+[bl]): s.fill(74,327,yb,18,340+i,dense=True)
    tr,br=s.shelf(438,226,700,lo,dep=14)
    for i,yb in enumerate(lo+[br]):
        if yb==lo[3]: brag(s,446,yb,12,yb-21);continue
        s.fill(444,697,yb,18,360+i,dense=True)
    for x0 in (330,428):
        s.box(x0,218,x0+10,404,'woodL');s.R(x0+2,220,x0+4,402,'wood')
    win(s,350,236,418,350)
    box3d(s,346,374,76,30,6,'woodL','woodL','wood')
    s.side_shelf('L',10,40,200,[40+22*k for k in range(1,8)],401);s.side_shelf('R',758,40,200,[40+22*k for k in range(1,8)],402)
    s.side_shelf('L',10,226,404,[226+22*k for k in range(1,8)],403);s.side_shelf('R',758,226,404,[226+22*k for k in range(1,8)],404)
    stairs(s,railing)
    items={'desklamp':[F_(lambda:banker_lamp(s,198,444),444)],
       'rug':[F_(lambda:rug(s,404,482,214,40),0)],
       'pile':[F_(lambda:pile(s,250,502,[(26,BOOKS[2],0),(22,BOOKS[6],3),(24,BOOKS[9],-1),(18,BOOKS[3],4)]),502),
               F_(lambda:pile(s,600,522,[(24,BOOKS[5],0),(20,BOOKS[7],2),(22,BOOKS[4],-2)]),522),
               F_(lambda:pile(s,118,470,[(22,BOOKS[1],0),(26,BOOKS[8],-2),(20,BOOKS[10],2),(24,BOOKS[0],0),(18,BOOKS[6],3)]),470)],
       'plant':[F_(lambda:pot_plant(s,40,522,True),522),F_(lambda:pot_plant(s,700,542,True),542)],
       'lamp':[F_(lambda:floorlamp(s,606,410,474),477)],
       'deco':[W_(lambda:postcard(s,354,358))],
       'chair':[F_(lambda:armchair(s,520,472),472),F_(lambda:sidetable(s,570,470),470),
                F_(lambda:armchair(s,250,548),548),F_(lambda:sidetable(s,300,546),546)],   # 복층은 넓어서 소파 한 쌍 더
       'pendant':[W_(lambda:variants.chandelier(s,384,0,24,124))],
       'valance':[W_(lambda:valance(s,346,422,36))],
       'globe':[F_(lambda:globe(s,660,466),466)],
       'ladder':[W_(lambda:rail_ladder(s,446,694,32,560,204,0.15,rail=railing))],
       'cushion':[W_(lambda:cushions(s,352,370))]}
    return s,items,(404,486)
# ---------- 스타일별 마감: 책장 색 · 벽 아래 판넬 · 다락방 지붕보 ----------
SHELF_TINT={   # 나무색 → 스타일 색(배경 그림의 책장·창틀·계단·난간에 적용, 가구 레이어는 그대로)
 'space':{'woodL':'white','wood':'grey','woodD':'greyD'},          # 금속 선반
 'manga':{'woodL':'white','wood':'cream','woodD':'wallD'},         # 흰 책장
 'study':{'woodL':'wood','wood':'woodD','woodD':'O'},              # 짙은 마호가니
}
def theme_deco(s,tk):
    T=s.T;FY=s.FY;px=s.im.load();W,H=s.W,s.H
    wallcols={K[c] for c in T['wallk']+T['side']}
    floorline=lambda x: FY if s.bx0<=x<s.bx1 else int(s.sidey(x,FY,'L' if x<s.bx0 else 'R'))
    ceilline=lambda x: s.by0 if s.bx0<=x<s.bx1 else int(s.sidey(x,s.by0,'L' if x<s.bx0 else 'R'))+1   # 천장은 그대로
    # 2) 책장 색(바닥은 건드리지 않는다)
    m=SHELF_TINT.get(tk)
    if m:
        src={K[a]:K[b] for a,b in m.items()}
        for x in range(W):
            for y in range(max(0,ceilline(x)),min(H,floorline(x)+1)):
                c=px[x,y]
                if c in src: px[x,y]=src[c]
    # 1) 벽 아래 판넬(다락방·서고): 벽색 픽셀만 칠해서 책장·창은 건드리지 않는다
    if tk in('attic','study'):
        ph=max(18,(FY-s.by0)//6)
        panel,frame,rail=(('wallS','wallD','woodL') if tk=='attic' else ('woodD','wood','woodL'))
        for x in range(W):
            if s.bx0<=x<s.bx1: y0,y1=FY-ph,FY
            else:
                side='L' if x<s.bx0 else 'R'
                y0,y1=int(s.sidey(x,FY-ph,side)),int(s.sidey(x,FY,side))
            for y in range(max(0,y0),min(H,y1)):
                if px[x,y] in wallcols:
                    c=panel
                    if y in(y0,y0+1): c=rail
                    elif s.bx0<=x<s.bx1 and ((x-s.bx0)%24 in(0,1) or y in(y0+4,y1-3)): c=frame
                    s.P(x,y,c)
    # 3) 다락방: 천장 아래 A자 지붕보(서까래 두 개 + 가로 들보)
    if tk=='attic':
        sw=round(W*0.15);sh=round((FY-s.by0)*0.24)
        t=max(3,W//96)
        for side in(-1,1):
            x0=0 if side<0 else W-1; x1=x0-side*sw*-1 if False else (x0+sw if side<0 else x0-sw)
            for k in range(t):
                s.line((x0,s.by0+sh+k),(x1,s.by0-2+k),'wood' if k else 'woodL')
            s.line((x0,s.by0+sh+t),(x1,s.by0-2+t),'O');s.line((x0,s.by0+sh-1),(x1,s.by0-3),'O')
        by=s.by0+3
        s.R(0,by,W,by+t,'wood');s.R(0,by,W,by+1,'woodL');s.R(0,by+t,W,by+t+1,'O');s.R(0,by-1,W,by,'O')
        for x in range(sw//2,W-sw//2,max(40,W//8)): s.R(x,by+1,x+2,by+t-1,'woodD')   # 들보 못 자리
def _decorated(bld):
    def f(tk):
        s,items,foot=bld(tk);theme_deco(s,tk);return s,items,foot
    return f
LEVELS=[_decorated(b) for b in (L1,L2,L3,L4)]
# 저녁·밤·새벽에 켜지는 조명이 밝히는 범위(타원 중심 x,y와 반지름). 아이템이 켜져 있을 때만 적용.
LIGHTS=[
 [dict(id='desklamp',x=109,y=180,rx=58,ry=52),dict(id='pendant',x=144,y=34,rx=44,ry=32),dict(id='pendant',x=144,y=150,rx=132,ry=100),dict(id='lamp',x=267,y=158,rx=40,ry=52)],
 [dict(id='desklamp',x=119,y=230,rx=62,ry=56),dict(id='pendant',x=192,y=44,rx=58,ry=42),dict(id='pendant',x=192,y=200,rx=176,ry=128),dict(id='lamp',x=321,y=226,rx=46,ry=58)],
 [dict(id='desklamp',x=183,y=294,rx=70,ry=62),dict(id='pendant',x=256,y=66,rx=80,ry=58),dict(id='pendant',x=256,y=270,rx=236,ry=170),dict(id='lamp',x=77,y=288,rx=52,ry=60)],
 [dict(id='desklamp',x=207,y=438,rx=80,ry=70),dict(id='pendant',x=384,y=88,rx=108,ry=78),dict(id='pendant',x=384,y=410,rx=350,ry=240),dict(id='lamp',x=607,y=442,rx=62,ry=66)]]
NAMES=['클로즈업','방','큰 서재','복층 서재']

# ---------- 레이어 추출 ----------
def item_layers(s,items):
    """같은 장면 위에서 표시색으로 덮은 뒤 그려, 그린 픽셀만 레이어로 뽑는다(배경과 같은 색이어도 빠지지 않음)."""
    keep=s.im.copy();out=[]
    for iid,_,_ in ITEMS:
      vks=variants.keys(iid) if iid in variants.SHAPES else [None]
      for vk in vks:
        variants.VAR[iid]=vk
        for fn,kind,base in items.get(iid,[]):
            s.im.paste(SENT,(0,0,s.W,s.H));fn()
            rgba=s.im.convert('RGBA')
            a=[0 if p==SENT else 255 for p in s.im.get_flattened_data()]
            al=Image.new('L',s.im.size);al.putdata(a);rgba.putalpha(al)
            bb=al.getbbox()
            if bb:
                cols={p for p,v in zip(s.im.get_flattened_data(),a) if v}
                assert cols<=set(PAL),('팔레트 밖 색',iid,cols-set(PAL))
                out.append(dict(id=iid,kind=kind,base=base,x=bb[0],y=bb[1],im=rgba.crop(bb),var=vk,default=vk==vks[0]))
      variants.VAR.pop(iid,None)
    s.im.paste(keep)
    # 샹들리에는 방 가운데 앞쪽에 매달려 있으므로 커튼·액자 같은 벽 물건보다 나중에(앞에) 그린다
    out.sort(key=lambda L:L['id']=='pendant')
    return out
def glass_mask(s):
    a=[255 if p==SENT else 0 for p in s.im.get_flattened_data()]
    m=Image.new('L',s.im.size);m.putdata(a);return m
def window_imgs(s,mask,scene,tod):
    """각 창 영역에 맞는 크기로 풍경을 그리고 유리 자리만 남긴 RGBA 조각들."""
    out=[]
    for (x0,y0,x1,y1) in s.glass:
        w,h=x1-x0,y1-y0;lift=s.lift.get((x0,y0,x1,y1),0)
        im=windows.render(scene,tod,w,h-lift,PAL,SKYPAL)
        if lift:   # 가려지는 아래쪽은 지면 띠 맨 아래 줄을 늘려 채운다
            full=Image.new('RGB',(w,h));full.paste(im,(0,0))
            for y in range(h-lift,h): full.paste(im.crop((0,h-lift-1,w,h-lift)),(0,y))
            im=full
        im=im.convert('RGBA')
        im.putalpha(mask.crop((x0,y0,x1,y1)));out.append(((x0,y0),im))
    return out
def walk_data(s,lays):
    """캐릭터가 걸을 수 있는 바닥(다각형)과 들를 곳(관심 지점). 좌표는 발 위치."""
    vx,vy=s.vp;FY=s.FY;H=s.H
    def wall_x(bx,y): return vx+(bx-vx)*(y-vy)/(FY-vy)
    top=FY+6;bot=H-3
    side=14 if any(L['id']=='x' for L in lays) else 10
    poly=[[round(wall_x(s.bx0,top))+side,top],[round(wall_x(s.bx1,top))-side,top],
          [min(s.W-6,round(wall_x(s.bx1,bot))-side),bot],[max(6,round(wall_x(s.bx0,bot))+side),bot]]
    # 바닥 물건 자리(러그처럼 납작한 건 제외): [x0, y0, x1, y1]
    blocks=[]
    for L in lays:
        if L['kind']!='floor' or not L['base'] or not L.get('default',True): continue
        x0,x1=L['x'],L['x']+L['im'].width
        blocks.append([x0-3,L['base']-7,x1+3,L['base']+3])
    poi=[]
    P=getattr(s,'poi',{})
    for (x,yb) in sorted(P.get('sofa',())): poi.append(dict(kind='sofa',x=x,y=yb+1,face='front'))
    for (x,yb) in sorted(P.get('plant',())):
        if yb<=FY: continue          # 책장 위 화분은 못 간다
        poi.append(dict(kind='plant',x=x-19 if x>s.W//2 else x+19,y=yb,face='right' if x>s.W//2 else 'left'))
    for (x0,y0,x1,y1) in s.glass:
        if y1<FY-140: continue      # 너무 높은 창(복층 위)은 아래에서 올려다본다
        poi.append(dict(kind='window',x=(x0+x1)//2,y=top+2,face='back'))
    lows=sorted({(a,b) for a,b,yb,mh in s.slots if yb>FY-30},key=lambda q:q[0])
    for a,b in lows[::max(1,len(lows)//3)][:3]: poi.append(dict(kind='shelf',x=(a+b)//2,y=top+2,face='back'))
    return dict(poly=poly,blocks=blocks,poi=poi)
def capacity(L,seed=1):
    """프로토타입 fillSlots와 같은 방식으로, 데모 책(쪽수 120~620, 양장 15%) 기준 수용량."""
    r=random.Random(seed)
    def bw():
        pg=120+int(r.random()*500);t=pg*0.06+(3 if r.random()<0.15 else 1);return max(2,min(4,round(t/6)))
    ws=[bw() for _ in range(8000)];bi=0
    for x0,x1,yb,mh in sorted(L['slots'],key=lambda p:(-p[2],p[0])):
        x=x0
        while x+ws[bi]<=x1-1: x+=ws[bi]+1;bi+=1
    return bi+L['sidecap']
def durl(im):
    b=io.BytesIO();im.save(b,'PNG',optimize=True);return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def compose(bg,wins,lays,foot=None,avatar=None):
    lays=[L for L in lays if L.get('default',True)]
    im=bg.convert('RGBA')
    for (xy,w) in wins: im.alpha_composite(w,xy)
    for L in lays:
        if L['kind']=='wall': im.alpha_composite(L['im'],(L['x'],L['y']))
    fl=sorted([L for L in lays if L['kind']=='floor'],key=lambda L:L['base'])
    for L in fl:
        if foot is None or L['base']<foot[1]: im.alpha_composite(L['im'],(L['x'],L['y']))
    if avatar is not None:
        im.alpha_composite(avatar,(foot[0]-avatar.width//2,foot[1]-avatar.height+1))
    for L in fl:
        if foot is not None and L['base']>=foot[1]: im.alpha_composite(L['im'],(L['x'],L['y']))
    return im
def export(outdir='.'):
    levels=[];previews={}
    for li,bld in enumerate(LEVELS):
        lv=None;wins_by_theme={}
        for tk in THEMES:
            s,items,foot=bld(tk)
            if lv is None:
                lays=item_layers(s,items)
                lv=dict(name=NAMES[li],W=s.W,H=s.H,slots=s.slots,brag=s.bragslots,foot=list(foot),sidecap=s.books,
                        items=[dict(id=L['id'],x=L['x'],y=L['y'],kind=L['kind'],base=L['base'],img=durl(L['im']),**({'var':L['var']} if L['var'] else {})) for L in lays],
                        bg={},win=[dict(x=b[0],y=b[1]) for b in s.glass])
                for w in lv['win']: w['img']={}
                lv['walk']=walk_data(s,lays)
                lv['fx']={'pendant':{k:{'glow':v['glow'],'sparkle':v['sparkle']} for k,v in getattr(s,'fx',{}).items()}}
            mask=glass_mask(s)
            day=window_imgs(s,mask,THEMES[tk]['scene'],'낮')
            bg=s.im.convert('RGBA')
            for (xy,w) in day: bg.alpha_composite(w,xy)
            bg=bg.convert('RGB');s.im.paste(bg);s.quantize();bg=s.im
            assert set(c for _,c in bg.getcolors(4096))<=set(PAL)
            lv['bg'][tk]=durl(bg)
            for tod in TODS:
                for k,(xy,w) in enumerate(window_imgs(s,mask,THEMES[tk]['scene'],tod)):
                    lv['win'][k]['img'].setdefault(tk,{})[tod]=durl(w)
            previews[(li,tk)]=(bg.copy(),day,foot)
            if tk=='attic': bg.save(os.path.join(outdir,f'empty_lv{li+1}.png'))
        lv['img']=lv['bg']['attic']   # 이전 버전 호환
        lv['cap']=capacity(lv)
        lv['lights']=[]
        for l in LIGHTS[li]:
            if l['id'] in variants.LIGHT_SHIFT:
                for sh,(dx,dy) in variants.LIGHT_SHIFT[l['id']].items(): lv['lights'].append(dict(l,x=l['x']+dx,y=l['y']+dy,shape=sh))
            else: lv['lights'].append(l)
        levels.append(lv);lv['_lays']=lays
        print(NAMES[li],len(lays),'layers','capacity',lv['cap'])
    return levels,previews
if __name__=='__main__':
    import os
    if not os.path.exists('art.json'):
        import export_art  # art.json(아바타 시트) 생성
    lv,prev=export()
    for li,L in enumerate(lv):
        bg,day,foot=prev[(li,'attic')]
        compose(bg,[],L['_lays']).convert('RGB').save(f'preview_lv{li+1}.png')
    for L in lv: L.pop('_lays')
    d=json.load(open('art.json'));d['levels']=lv;d['itemdefs']=[dict(id=i,th=t,name=n,**({'vars':variants.defs(i)} if i in variants.SHAPES else {})) for i,t,n in ITEMS]
    d['themes']={k:dict(name=v['name'],genre=v['genre'],scene=v['scene']) for k,v in THEMES.items()};d['tods']=TODS;d['pal']=[list(c) for c in PAL]
    open('art2.json','w').write(json.dumps(d,ensure_ascii=False));print(len(json.dumps(d))//1024,'KB')
