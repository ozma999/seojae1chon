from lib import Scene, BOOKS, K
import random
def window(s,x0,y0,x1,y1,arch=False):
    s.box(x0-4,y0-4,x1+4,y1+4,'wood');s.R(x0-3,y1+1,x1+3,y1+3,'woodL')
    s.R(x0,y0,x1,y1,'sky')
    for y in range(y0,y0+(y1-y0)//4,3): s.R(x0,y,x1,y+1,'skyL')
    hz=y0+int((y1-y0)*0.62)
    s.R(x0,hz,x1,y1,'sea')
    for y in range(hz+3,y1,3):
        for x in range(x0+(y%2)*3,x1,7): s.R(x,y,x+3,y+1,'skyL' if y<hz+10 else 'seaD')
    ix=x1-int((x1-x0)*0.4)
    s.d.polygon([(ix,hz),(ix+4,hz-5),(ix+12,hz-6),(ix+18,hz)],fill=K['green']);s.R(ix+2,hz-1,ix+18,hz,'greenD')
    s.R(ix+9,hz-14,ix+12,hz-6,'white');s.R(ix+9,hz-11,ix+12,hz-9,'red');s.R(ix+8,hz-15,ix+13,hz-14,'O');s.P(ix+10,hz-16,'yellow')
    for cx,cy,w in [(x0+6,y0+10,12),(x0+(x1-x0)//2,y0+18,8),(x1-14,y0+6,9)]:
        s.R(cx,cy,cx+w,cy+3,'white');s.R(cx+2,cy-2,cx+w-3,cy,'white')
    my=(y0+y1)//2;mx=(x0+x1)//2
    s.R(x0,my,x1,my+2,'wood');s.R(x0,my,x1,my+1,'O');s.R(mx-1,y0,mx+1,y1,'wood');s.R(mx-1,y0,mx,y1,'O')
    if arch:
        for i in range(10):
            w=int(((10-i)/10)**2*((x1-x0)//2))
            s.R(x0,y0+i,x0+w,y0+i+1,'wall');s.R(x1-w,y0+i,x1,y0+i+1,'wall')
            s.P(x0+w,y0+i,'O');s.P(x1-w-1,y0+i,'O')
def plant(s,x,yb,big=False):
    pw=14 if big else 12;ph=14 if big else 12
    s.box(x,yb-ph,x+pw,yb,'orange');s.R(x+1,yb-ph+1,x+pw-1,yb-ph+3,'redD')
    m=x+pw//2;hgt=26 if big else 16
    s.R(m-1,yb-ph-hgt,m+1,yb-ph,'greenD')
    rr=random.Random(x)
    for i in range(9 if big else 6):
        lx=m+rr.randint(-9,6);ly=yb-ph-rr.randint(4,hgt);w=rr.randint(4,7)
        s.R(lx,ly,lx+w,ly+3,'green');s.R(lx,ly+2,lx+w,ly+3,'greenD');s.P(lx+1,ly,'yellow') if rr.random()<0.3 else None
def floorlamp(s,x,ytop,yb):
    s.R(x,ytop+12,x+2,yb,'O');s.R(x-4,yb,x+6,yb+3,'O')
    s.poly([(x-8,ytop),(x+10,ytop),(x+6,ytop+12),(x-4,ytop+12)],'cream')
    for y in range(0):
        t=(y-ytop)/(yb-ytop);a=int(4+t*16)
        for xx in range(x-a,x+a+2):
            if (xx+2*y)%7==0 and s.im.getpixel((xx,y))!=K['O']: s.P(xx,y,'cream')
def pendant(s,x,y0,y1):
    s.R(x,y0,x+1,y1,'O');s.poly([(x-6,y1),(x+7,y1),(x+4,y1-5),(x-3,y1-5)],'yellow');s.R(x-2,y1+1,x+3,y1+2,'cream')
def booklie(s,x,y,specs):
    for k,(w,col,dx) in enumerate(specs):
        c,sh=col;xx=x+dx
        s.R(xx,y-4,xx+w,y,c);s.R(xx,y-1,xx+w,y,sh)
        if k%2: s.R(xx+1,y-3,xx+w-1,y-2,'white')
        s.R(xx,y-5,xx+w,y-4,'O');s.R(xx-1,y-5,xx,y,'O');s.R(xx+w,y-5,xx+w+1,y,'O');y-=5;s.books+=1
def rug(s,cx,cy,rx,ry):
    s.d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=K['O']);s.d.ellipse([cx-rx+1,cy-ry+1,cx+rx-1,cy+ry-1],fill=K['blue'])
    s.d.ellipse([cx-rx+7,cy-ry+3,cx+rx-7,cy+ry-3],fill=K['navy']);s.d.ellipse([cx-rx+11,cy-ry+5,cx+rx-11,cy+ry-5],fill=K['blue'])
    for x in range(cx-rx+10,cx+rx-10,6): s.P(x,cy,'cream');s.P(x+3,cy,'cream')
def openbook(s,x,y):
    pts=[(x,y+3),(x+12,y),(x+24,y+3),(x+24,y+8),(x+12,y+6),(x,y+8)]
    s.poly(pts,'white');s.line((x+12,y),(x+12,y+6),'wallD')
    for yy in (y+3,y+5): s.R(x+3,yy,x+10,yy+1,'wallS');s.R(x+14,yy,x+22,yy+1,'wallS')
def mug(s,x,y):
    s.box(x,y,x+7,y+8,'white');s.R(x+1,y+1,x+6,y+2,'woodD');s.R(x+7,y+2,x+9,y+3,'O');s.R(x+8,y+2,x+9,y+6,'O');s.R(x+7,y+5,x+9,y+6,'O')
def brag(s,x0,yb,n,glowy):
    if s.nobooks: s.bragslots.append([x0,yb,n])
    pats=['circle','band','split','stripe']
    for k in range(n):
        col=[BOOKS[0],BOOKS[5],BOOKS[3],BOOKS[7],BOOKS[9],BOOKS[1],BOOKS[8],BOOKS[11]][k%8]
        if not s.nobooks: s.cover(x0+k*19,yb,col,pats[k%4])
    for x in range(x0,x0+n*19-2,2): s.P(x,glowy,'yellow')
    for y in range(glowy+1,glowy+4):
        for x in range(x0+(y%2),x0+n*19-2,3):
            if s.im.getpixel((x,y))==K['deep']: s.P(x,y,'woodD')

# ================= Lv.1 =================
def lv1(sex='m',name='lv1',nob=False):
    s=Scene(288,216,(144,40),140,seed=3);s.nobooks=nob
    s.shell(26,12,262)
    window(s,118,28,170,82)
    # curtain
    s.R(104,20,184,22,'woodD');s.P(103,20,'O');s.P(184,20,'O')
    s.poly([(106,22),(124,22),(120,60),(116,98),(104,100)],'red')
    for x0 in (110,116): s.line((x0,23),(x0-3,98),'redD')
    s.line((108,23),(106,96),'pink');s.R(102,58,122,60,'redD');s.R(102,58,122,59,'O')
    # left shelf
    rowsL=[42,64,86,108]
    tops,base=s.shelf(30,20,104,rowsL,dep=10)
    for i,yb in enumerate(rowsL+[base]):
        s.fill(34+(2 if i!=2 else 2),101,yb,18 if i else 16,10+i)
    # right shelf + brag top row
    rowsR=[82,106]
    tops,base=s.shelf(186,56,258,rowsR,dep=10)
    brag(s,191,82,3,62)
    s.fill(190,253,106,18,30);s.fill(190,253,base,18,31)
    # top of right shelf
    plant(s,240,52);booklie(s,192,53,[(26,BOOKS[1],0),(22,BOOKS[8],2),(24,BOOKS[4],4)])
    # postcard
    pc=[(111,104),(126,102),(127,113),(112,115)];s.poly(pc,'white');s.R(115,106,123,107,'sky');s.R(115,109,121,110,'wallD');s.P(119,103,'red')
    # side wall frame
    s.side_quad('R',268,282,40,70,'O',False);s.side_quad('R',269,281,42,68,'skyL',False);s.side_quad('R',269,281,60,68,'green',False)
    pendant(s,144,0,12)
    # floor
    rug(s,144,199,56,13)
    booklie(s,40,194,[(24,BOOKS[2],0),(20,BOOKS[6],3),(23,BOOKS[9],-1),(17,BOOKS[3],4),(15,BOOKS[0],2)])
    openbook(s,206,192);mug(s,236,190)
    floorlamp(s,266,104,186)
    s.R(134,203,154,205,'navy');s.avatar7(144,205,sex)
    if nob: return s
    s.save(name,3)
# ================= Lv.3 =================
def lv3(nob=False):
    s=Scene(512,384,(256,70),268,seed=5);s.nobooks=nob
    s.shell(44,16,468)
    window(s,232,50,280,176,arch=True)
    rows=[22+22*k for k in range(1,11)]
    tl,bl=s.shelf(50,24,222,rows,dep=16)
    for i,yb in enumerate(rows+[bl]): s.fill(56,219,yb,18,100+i,dense=True)
    tr,br=s.shelf(290,24,462,rows,dep=16)
    bragrow=rows[5]
    for i,yb in enumerate(rows+[br]):
        if yb==bragrow: brag(s,296,yb,8,yb-21);continue
        s.fill(294,457,yb,18,200+i,dense=True)
    # pilasters between shelves and window + crown molding
    for x0 in (222,280):
        s.box(x0,18,x0+10,268,'woodL');s.R(x0+2,20,x0+4,266,'wood');s.R(x0-1,18,x0+11,24,'wood');s.R(x0-1,262,x0+11,270,'wood')
    s.R(44,16,468,22,'wood');s.R(44,16,468,17,'woodL');s.R(44,22,468,23,'O')
    for x in range(48,466,8): s.P(x,19,'woodD')
    # small shelf over window
    s.box(232,26,280,42,'wood');s.R(235,29,277,39,'deep');s.fill(236,276,39,10,99,dense=True)
    # window seat between pilasters
    s.box(230,236,282,270,'woodL');s.R(232,238,280,240,'wood')
    s.box(232,228,280,238,'teal');s.R(233,229,279,231,'green')
    s.box(236,218,252,230,'cream');s.box(258,220,274,230,'pink')
    # side walls: shelves + high windows (perspective)
    rowsY=[74+22*k for k in range(1,9)]
    s.side_shelf('L',8,74,268,rowsY,301);s.side_shelf('R',503,74,268,rowsY,302)
    s.side_window('L',38,16,28,62);s.side_window('R',474,496,28,62)
    # ladder
    for t in range(0,236):
        y=30+t;x=int(196+t*0.07)
        s.P(x,y,'woodD');s.P(x+1,y,'wood');s.P(x+14,y,'woodD');s.P(x+15,y,'wood')
    for y in range(40,262,14):
        x=int(196+(y-30)*0.07);s.R(x,y,x+16,y+2,'woodL');s.R(x,y+2,x+16,y+3,'O')
    s.R(194,264,214,267,'O')
    pendant(s,256,0,14)
    # reading corner on floor (left): armchair facing viewer + side table + lamp
    ax,ay=98,318
    s.box(ax,ay-30,ax+34,ay-12,'teal');s.R(ax+2,ay-28,ax+32,ay-26,'green')
    s.box(ax-4,ay-18,ax+38,ay,'teal');s.box(ax-6,ay-22,ax+4,ay+1,'teal');s.box(ax+30,ay-22,ax+40,ay+1,'teal')
    s.R(ax+4,ay-17,ax+30,ay-14,'green');s.R(ax-2,ay,ax+2,ay+4,'O');s.R(ax+34,ay,ax+38,ay+4,'O')
    s.box(ax+46,ay-14,ax+62,ay-10,'woodL');s.R(ax+48,ay-10,ax+50,ay+3,'O');s.R(ax+58,ay-10,ax+60,ay+3,'O');mug(s,ax+50,ay-22)
    floorlamp(s,ax-18,ay-62,ay+2)
    plant(s,452,330,big=True)
    rug(s,268,334,104,20)
    booklie(s,170,350,[(26,BOOKS[2],0),(22,BOOKS[6],3),(24,BOOKS[9],-1),(18,BOOKS[3],4)])
    booklie(s,392,334,[(24,BOOKS[5],0),(20,BOOKS[7],2),(22,BOOKS[4],-2)])
    openbook(s,318,344);mug(s,350,342)
    s.d.ellipse([414,296,430,312],fill=K['O']);s.d.ellipse([415,297,429,311],fill=K['sea']);s.R(418,300,424,304,'green');s.R(421,312,423,318,'O');s.R(416,318,428,320,'O')
    s.R(256,339,280,341,'navy');s.avatar7(268,341,'m')
    s.avatar7(150,352,'f','long','librarian');s.avatar7(380,348,'m','curly','hoodie')
    if nob: return s
    s.save('lv3',2)
if __name__=='__main__':
    lv1('m','lv1m');lv1('f','lv1f');lv3()

def lv2(nob=False):
    s=Scene(384,288,(192,48),186,seed=8);s.nobooks=nob
    s.shell(26,12,358)
    window(s,166,30,218,90)
    s.R(152,22,232,24,'woodD');s.poly([(214,24),(230,24),(232,104),(220,102),(216,64)],'red')
    for x0 in (222,226): s.line((x0,25),(x0+2,100),'redD')
    tl,bl=s.shelf(30,22,104,[44,66,88,110,132,154],dep=10)
    for i,yb in enumerate([44,66,88,110,132,154,bl]): s.fill(34,101,yb,18 if i else 16,40+i)
    t2,b2=s.shelf(110,62,158,[84,106,128,150],dep=10)
    for i,yb in enumerate([84,106,128,150,b2]): s.fill(114,155,yb,18,50+i)
    plant(s,124,58);booklie(s,138,57,[(16,BOOKS[3],0),(14,BOOKS[6],1)])
    t3,b3=s.shelf(228,62,300,[84,106,128,150],dep=10)
    brag(s,233,84,3,64)
    for i,yb in enumerate([106,128,150,b3]): s.fill(232,297,yb,18,60+i)
    booklie(s,234,57,[(24,BOOKS[1],0),(20,BOOKS[8],2),(22,BOOKS[4],3)])
    t4,b4=s.shelf(306,22,354,[44,66,88,110,132,154],dep=10)
    for i,yb in enumerate([44,66,88,110,132,154,b4]): s.fill(310,351,yb,18,70+i)
    pc=[(150,112),(164,110),(165,121),(151,123)];s.poly(pc,'white');s.R(154,114,161,115,'sky');s.P(157,111,'red')
    pendant(s,192,0,14)
    rug(s,192,258,74,16)
    ax,ay=58,262
    s.box(ax,ay-24,ax+28,ay-10,'teal');s.box(ax-3,ay-14,ax+31,ay,'teal');s.box(ax-5,ay-17,ax+3,ay+1,'teal');s.box(ax+25,ay-17,ax+33,ay+1,'teal');s.R(ax+3,ay-13,ax+25,ay-11,'green')
    booklie(s,96,262,[(20,BOOKS[2],0),(18,BOOKS[9],2),(16,BOOKS[0],1)])
    openbook(s,262,252);mug(s,290,250)
    floorlamp(s,330,170,256);plant(s,340,272)
    s.avatar7(192,266,'m')
    if nob: return s
    s.save('lv2',2)

def lv4(nob=False):
    s=Scene(768,576,(384,96),404,seed=12);s.nobooks=nob
    s.shell(60,18,708)
    # upper level (mezzanine) shelves standing on the balcony
    FY0=s.FY;s.FY=206
    up=[30+22*k for k in range(1,8)]
    tu,bu=s.shelf(68,28,330,up,dep=8)
    for i,yb in enumerate(up+[bu]): s.fill(74,327,yb,18,300+i,dense=True)
    tv,bv=s.shelf(438,28,700,up,dep=8)
    for i,yb in enumerate(up+[bv]): s.fill(444,697,yb,18,320+i,dense=True)
    s.FY=FY0
    window(s,346,40,422,196,arch=True)
    # balcony floor + railing
    s.R(60,206,708,216,'woodL');s.R(60,214,708,217,'wood');s.R(60,217,708,218,'O');s.R(60,205,708,206,'O')
    s.R(60,184,708,187,'wood');s.R(60,184,708,185,'woodL');s.R(60,187,708,188,'O')
    for x in range(64,708,14): s.R(x,188,x+3,206,'wood');s.R(x+2,188,x+3,206,'woodD')
    # lower level shelves
    lo=[226+22*k for k in range(1,8)]
    tl,bl=s.shelf(68,226,330,lo,dep=14)
    for i,yb in enumerate(lo+[bl]): s.fill(74,327,yb,18,340+i,dense=True)
    tr,br=s.shelf(438,226,700,lo,dep=14)
    bragrow=lo[3]
    for i,yb in enumerate(lo+[br]):
        if yb==bragrow: brag(s,446,yb,12,yb-21);continue
        s.fill(444,697,yb,18,360+i,dense=True)
    for x0 in (330,428):
        s.box(x0,218,x0+10,404,'woodL');s.R(x0+2,220,x0+4,402,'wood')
    # lower center: window seat nook
    window(s,350,236,418,350)
    s.box(346,366,422,404,'woodL');s.box(348,356,420,368,'teal');s.box(354,346,374,358,'cream');s.box(392,348,412,358,'pink')
    # side walls, two tiers
    s.side_shelf('L',10,40,200,[40+22*k for k in range(1,8)],401);s.side_shelf('R',758,40,200,[40+22*k for k in range(1,8)],402)
    s.side_shelf('L',10,226,404,[226+22*k for k in range(1,8)],403);s.side_shelf('R',758,226,404,[226+22*k for k in range(1,8)],404)
    # stairs up to the balcony (left)
    for i in range(13):
        x=96+i*16;y=398-i*14
        s.box(x,y-14,x+30,y,'woodL');s.R(x+1,y-13,x+29,y-11,'wood')
    s.R(96,384,98,404,'O')
    pendant(s,384,0,20)
    rug(s,404,478,160,32)
    ax,ay=520,470
    s.box(ax,ay-30,ax+34,ay-12,'teal');s.box(ax-4,ay-18,ax+38,ay,'teal');s.box(ax-6,ay-22,ax+4,ay+1,'teal');s.box(ax+30,ay-22,ax+40,ay+1,'teal');s.R(ax+4,ay-17,ax+30,ay-14,'green')
    s.box(ax+48,ay-14,ax+64,ay-10,'woodL');s.R(ax+50,ay-10,ax+52,ay+3,'O');s.R(ax+60,ay-10,ax+62,ay+3,'O');mug(s,ax+52,ay-22)
    floorlamp(s,ax+80,ay-64,ay+2)
    booklie(s,250,500,[(26,BOOKS[2],0),(22,BOOKS[6],3),(24,BOOKS[9],-1),(18,BOOKS[3],4),(20,BOOKS[0],1)])
    booklie(s,600,520,[(24,BOOKS[5],0),(20,BOOKS[7],2),(22,BOOKS[4],-2)])
    plant(s,40,520,big=True);plant(s,700,540,big=True)
    s.d.ellipse([640,440,658,458],fill=K['O']);s.d.ellipse([641,441,657,457],fill=K['sea']);s.R(645,445,651,450,'green');s.R(648,458,650,464,'O');s.R(643,464,655,466,'O')
    s.avatar7(404,486,'m')
    if nob: return s
    s.save('lv4',1)
