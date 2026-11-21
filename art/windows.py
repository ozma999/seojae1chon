import fonts
from PIL import Image, ImageDraw, ImageFont
import random, math
WW,WH=40,32
TIMES={'새벽':dict(top=(70,78,150),bot=(236,168,150),tint=(.82,.78,.92),add=(30,10,30),sun=(250,210,170),night=False),
 '낮':dict(top=(96,180,236),bot=(186,228,248),tint=(1,1,1),add=(0,0,0),sun=(255,244,200),night=False),
 '노을':dict(top=(86,62,130),bot=(250,146,84),tint=(1.0,.72,.62),add=(30,0,0),sun=(255,200,110),night=False),
 '밤':dict(top=(12,18,44),bot=(36,46,96),tint=(.32,.38,.58),add=(0,0,10),sun=(240,240,210),night=True)}
def T(c,t):
    return tuple(max(0,min(255,int(c[i]*t['tint'][i]+t['add'][i]))) for i in range(3))
def render(scene,tn,w=WW,h=WH,pal=None,skypal=None):
    """w×h 크기로 창밖 풍경을 그린다. 지면 띠(높이 32)는 아래에 붙이고, 남는 위쪽은 하늘로 늘린다.
    고정 위치 소품은 가로 가운데 정렬(ox), 가로 전체에 걸친 지형은 폭 w만큼 반복한다."""
    t=TIMES[tn];r=random.Random(sum(map(ord,scene)))
    top,bot=t['top'],t['bot']
    if scene=='우주':
        top,bot={'새벽':((40,20,70),(120,60,140)),'낮':((10,20,60),(40,90,150)),'노을':((50,10,40),(160,60,80)),'밤':((5,5,20),(20,20,60))}[tn]
    if scene=='바닷속':
        top,bot={'새벽':((20,80,120),(60,150,170)),'낮':((20,110,170),(90,200,220)),'노을':((40,70,110),(120,140,150)),'밤':((5,20,50),(15,50,90))}[tn]
    # ---- sky (full height): 위쪽 남는 영역은 top 색, 띠 영역에서 bot까지 ----
    sky=Image.new('RGB',(w,h));sd=ImageDraw.Draw(sky)
    dy=h-WH;ox=(w-WW)//2
    near=lambda c,P:min(P,key=lambda p:sum((a-b)**2 for a,b in zip(c,p)))
    span=min(h,2*WH);rowc=[tuple(int(top[i]+(bot[i]-top[i])*max(0,(y-(h-span))/(span-1))) for i in range(3)) for y in range(h)]
    if skypal:   # 방 팔레트 모드: 하늘을 몇 개의 띠로 나누고 띠 경계만 체크무늬로 섞는다
        q=[near(c,skypal) for c in rowc]
        for y in range(h):
            sd.line([(0,y),(w,y)],fill=q[y])
            if 0<y and q[y]!=q[y-1]:
                for x in range(y%2,w,2): sky.putpixel((x,y),q[y-1])
                if y+1<h:
                    for x in range((y+1)%2,w,4): sky.putpixel((x,y+1),q[y-1])
    else:
        for y in range(h): sd.line([(0,y),(w,y)],fill=rowc[y])
        for y in range(dy%4,h,4):   # dither bands (원본과 같은 위상)
            for x in range(((y-dy)//4)%2,w,2):
                if y+2<h: sky.putpixel((x,y+2),sky.getpixel((x,min(h-1,y+4))))
    night=t['night']
    if night or scene=='우주':
        n=(22 if scene=='우주' else 14)*max(1,w*max(h,WH)//(WW*WH))
        for _ in range(n): sky.putpixel((r.randrange(w),r.randrange(max(1,dy+WH//2))),(250,250,230))
    sx={'새벽':6,'낮':28,'노을':32,'밤':10}[tn];sy={'새벽':16,'낮':6,'노을':15,'밤':6}[tn]
    def sun(x,y,rad=3):
        if scene=='바닷속': return
        x+=ox;y+=dy
        sd.ellipse([x-rad,y-rad,x+rad,y+rad],fill=t['sun'])
        if night:
            cx=min(w-1,max(0,x+rad+3));cy=min(h-1,max(0,y))
            sd.ellipse([x-rad+2,y-rad-1,x+rad+2,y+rad-1],fill=sky.getpixel((cx,cy)))
    # ---- ground band (w×32, transparent) ----
    im=Image.new('RGBA',(w,WH),(0,0,0,0));d=ImageDraw.Draw(im)
    def pp(xy,c):
        if 0<=xy[0]<w and 0<=xy[1]<WH: im.putpixel(xy,c)
    G=lambda c:T(c,t)
    lit=(250,214,120)
    O=lambda pts:[(x+ox,y) for x,y in pts]
    def hills(base,amp,f,col,ph=0):
        for x in range(w):
            hh=int(base-amp*math.sin(x*f+ph)-amp*0.5*math.sin(x*f*2.3+ph))
            d.line([(x,hh),(x,WH)],fill=G(col))
    def conifer(x,yb,hh,col):
        for i in range(hh):
            ww=(i*2)//3
            d.line([(x-ww//2,yb-hh+i),(x+ww//2,yb-hh+i)],fill=G(col))
        pp((x,yb),G((90,60,40)))
    def buildings(base,cols,seed,maxh=16,winp=0.35):
        rr=random.Random(seed);x=0
        while x<w:
            bw=rr.randint(4,8);bh=rr.randint(6,maxh);c=rr.choice(cols)
            d.rectangle([x,base-bh,x+bw-1,WH],fill=G(c))
            for wy in range(base-bh+2,WH-1,3):
                for wx in range(x+1,x+bw-1,2):
                    if night and rr.random()<0.45: pp((wx,wy),lit)
                    elif not night and rr.random()<winp: pp((wx,wy),G((200,220,236)))
            x+=bw+rr.randint(0,1)
    if scene=='바다':
        sun(sx,sy);d.rectangle([0,20,w,WH],fill=G((50,130,200)))
        for y in range(22,WH,3):
            for x in range(y%4,w,6): d.line([(x,y),(x+2,y)],fill=G((150,210,240)))
        d.polygon(O([(26,20),(29,16),(35,16),(38,20)]),fill=G((80,150,80)));d.rectangle([31+ox,10,32+ox,16],fill=G((240,240,230)));pp((31+ox,9),lit if night else G((220,60,50)))
    elif scene=='도시':
        sun(sx,sy);buildings(26,[(90,110,140),(120,130,150),(70,90,120)],1,20)
        buildings(30,[(60,70,90),(80,90,110)],2,12)
    elif scene=='숲':
        sun(sx,sy);hills(18,2,.3,(110,170,110))
        for x in range(-2,w,5): conifer(x+r.randint(0,2),WH,r.randint(12,20),(50,120,70))
        for x in range(0,w,4): conifer(x,WH+2,r.randint(8,12),(40,100,60))
    elif scene=='설산':
        sun(sx,sy);d.polygon(O([(-ox,26),(12,8),(22,22),(30,10),(WW+ox,24),(WW+ox,WH),(-ox,WH)]),fill=G((120,130,160)))
        d.polygon(O([(9,12),(12,8),(15,12),(13,13),(11,12)]),fill=G((245,245,250)));d.polygon(O([(27,14),(30,10),(33,14),(31,15)]),fill=G((245,245,250)))
        hills(28,1,.4,(235,238,245))
    elif scene=='눈마을':
        sun(sx,sy);hills(24,1,.2,(235,238,245))
        for x0 in (4,18,30):
            x0+=ox
            d.rectangle([x0,20,x0+7,26],fill=G((150,100,70)));d.polygon([(x0-1,20),(x0+3,16),(x0+8,20)],fill=G((240,240,245)))
            pp((x0+3,23),lit if night or tn=='새벽' else G((180,200,220)))
        for _ in range(26*max(1,w//WW)): pp((r.randrange(w),r.randrange(WH)),(250,250,255))
    elif scene=='사막':
        sun(sx,sy,4);hills(22,2,.15,(226,180,110));hills(26,2,.25,(206,150,90),1.5)
        d.rectangle([30+ox,16,31+ox,24],fill=G((70,130,70)));d.rectangle([28+ox,18,29+ox,20],fill=G((70,130,70)));d.rectangle([32+ox,17,33+ox,19],fill=G((70,130,70)))
    elif scene=='우주':
        d.ellipse(O([(20,12),(36,28)]),fill=(200,120,80) if tn!='밤' else (120,140,200));d.line(O([(16,22),(40,16)]),fill=(230,210,180))
        d.ellipse(O([(4,4),(8,8)]),fill=(230,230,240))
    elif scene=='시골논':
        sun(sx,sy);hills(16,2,.2,(100,150,100))
        for y in range(20,WH):
            c=(130,180,80) if (y//3)%2 else (110,160,70)
            d.line([(0,y),(w,y)],fill=G(c))
        d.rectangle([6+ox,15,12+ox,19],fill=G((180,90,60)));d.polygon(O([(5,15),(9,12),(13,15)]),fill=G((90,70,60)))
    elif scene=='한강':
        sun(sx,sy);buildings(18,[(110,120,150),(90,100,130)],5,10)
        d.rectangle([0,20,w,WH],fill=G((60,110,170)))
        d.line([(0,21),(w,21)],fill=G((200,200,210)))
        for x in range(2,w,6): d.line([(x,21),(x,26)],fill=G((180,180,190)))
        if night:
            for x in range(1,w,3): pp((x,20),lit)
    elif scene=='아파트':
        sun(sx,sy)
        for x0 in range(2-13*((ox+12)//13),w,13):
            d.rectangle([x0,8,x0+9,WH],fill=G((220,214,200)));d.rectangle([x0,8,x0+9,9],fill=G((200,90,70)))
            for wy in range(11,WH,3):
                for wx in range(x0+1,x0+9,2): pp((wx,wy),lit if (night and r.random()<0.5) else G((150,170,190)))
    elif scene=='벚꽃길':
        sun(sx,sy);hills(26,0,.1,(170,150,130))
        xs=[x+ox for x in (4,20,34)];k=1
        while 4+ox-16*k>-8 or 34+ox+16*k<w+8: xs+=[4+ox-16*k,34+ox+16*k];k+=1
        for x0 in xs:
            d.line([(x0,WH),(x0,18)],fill=G((110,70,60)));d.ellipse([x0-7,6,x0+7,20],fill=G((246,190,210)));d.ellipse([x0-4,9,x0+3,15],fill=G((252,220,230)))
        for _ in range(12*max(1,w//WW)): pp((r.randrange(w),r.randrange(18,WH)),G((250,200,215)))
    elif scene=='단풍산':
        sun(sx,sy);hills(14,3,.2,(200,110,60));hills(20,3,.3,(220,150,60),2);hills(26,2,.4,(170,70,50),1)
    elif scene=='비오는거리':
        bg=G((120,130,150)) if not night else (30,34,56)
        sd.rectangle([0,0,w,h],fill=bg)
        buildings(28,[(80,86,104),(96,100,118)],9,18)
    elif scene=='별들판':
        sun(sx,sy);hills(24,1,.15,(110,160,90))
        d.line([(0,WH-1),(w,WH-1)],fill=G((80,130,70)))
        for x in range(0,w,3): pp((x,25+(x%2)),G((240,220,120)))
    elif scene=='바닷속':
        for _ in range(8*max(1,w*h//(WW*WH))):
            sky.putpixel((r.randrange(w),r.randrange(h)),(200,240,250))
        hills(28,2,.3,(220,200,150))
        for x0 in (6,30):
            x0+=ox;d.line([(x0,WH),(x0-2,18)],fill=(60,150,90));d.line([(x0+2,WH),(x0+4,20)],fill=(60,150,90))
        d.polygon(O([(18,14),(24,12),(26,14),(24,16)]),fill=(250,150,60));pp((25+ox,14),(20,20,20))
    elif scene=='호숫가':
        sun(sx,sy);hills(18,2,.25,(90,140,100))
        d.rectangle([0,22,w,WH],fill=G((80,140,190)))
        for x in range(0,w,7): d.line([(x,25),(x+3,25)],fill=G((170,210,230)))
        d.rectangle([28+ox,15,34+ox,21],fill=G((140,90,60)));d.polygon(O([(27,15),(31,11),(35,15)]),fill=G((170,60,50)));pp((31+ox,18),lit if night else G((200,210,220)))
    sky.paste(im,(0,dy),im)
    if scene=='비오는거리':   # 빗줄기는 건물 위에도
        for _ in range(60*max(1,w*h//(WW*WH))):
            x,y=r.randrange(w),r.randrange(h);sky.putpixel((x,y),G((200,210,230)) if not night else (120,130,170))
    return to_pal(sky,pal) if pal else sky
def to_pal(im,pal):
    """RGB 이미지를 주어진 팔레트(색 튜플 목록)의 가장 가까운 색으로 강제 변환."""
    im=im.convert('RGB');px=im.load();cache={}
    for y in range(im.height):
        for x in range(im.width):
            c=px[x,y]
            if c not in cache: cache[c]=min(pal,key=lambda p:sum((a-b)**2 for a,b in zip(c,p)))
            px[x,y]=cache[c]
    return im
SCENES=['바다','도시','숲','설산','눈마을','사막','우주','시골논','한강','아파트','벚꽃길','단풍산','비오는거리','별들판','바닷속','호숫가']
def sheet():
    S=4;fw=WW*S+24;cell_w=fw+16;cell_h=WH*S+24+44
    cols=8;rows=8
    out=Image.new('RGB',(cell_w*cols+20,cell_h*rows+20),(246,244,238));d=ImageDraw.Draw(out)
    f=fonts.get(18,True)
    i=0
    for sc in SCENES:
        for tn in TIMES:
            im=render(sc,tn).quantize(colors=14,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
            gx,gy=10+(i%cols)*cell_w,10+(i//cols)*cell_h
            d.rectangle([gx,gy,gx+fw-1,gy+WH*S+24-1],fill=(27,22,38));d.rectangle([gx+2,gy+2,gx+fw-3,gy+WH*S+21],fill=(150,96,58))
            d.rectangle([gx+4,gy+4,gx+fw-5,gy+WH*S+19],fill=(192,132,84))
            out.paste(im.resize((WW*S,WH*S),Image.NEAREST),(gx+12,gy+12))
            d.rectangle([gx+12+WW*S//2-2,gy+12,gx+12+WW*S//2+1,gy+12+WH*S],fill=(150,96,58))
            d.text((gx+4,gy+WH*S+28),f'{i+1:02d} {sc} · {tn}',fill=(27,22,38),font=f)
            i+=1
    out.save(fonts.out('window-views-64.png'));print(out.size,i)
if __name__=='__main__':
    sheet()
