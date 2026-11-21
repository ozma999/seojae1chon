import fonts
from PIL import Image, ImageDraw, ImageFont
from lib import PAL32 as K
OFF=4
W,H=28,43+OFF
def make(hair='m_basic',outfit='basic',hc=('woodD','deep','wood'),breath=0,hood=None):
    im=Image.new('RGBA',(W,H),(0,0,0,0));c=lambda n:K[n]+(255,)
    def P(x,y,n):
        y+=OFF
        if 0<=x<W and 0<=y<H: im.putpixel((x,y),c(n))
    def G(x,y):
        y+=OFF
        return im.getpixel((x,y)) if 0<=x<W and 0<=y<H else (0,0,0,0)
    def R(x0,y0,x1,y1,n):
        for y in range(y0,y1):
            for x in range(x0,x1): P(x,y,n)
    def E(b,n):
        t=Image.new('L',(W,H),0);ImageDraw.Draw(t).ellipse([b[0],b[1]+OFF,b[2],b[3]+OFF],fill=255)
        for y in range(H):
            for x in range(W):
                if t.getpixel((x,y)): P(x,y-OFF,n)
    HB,HD,HL=hc
    # ================= back hair =================
    if hair in('f_bob',):
        E([1,1,26,22],HD);R(2,12,26,25,HD)
    elif hair=='long':
        E([1,1,26,22],HD);R(2,12,26,34,HD)
        for x in range(2,26,3): P(x,34,HD)
    elif hair=='pony':
        E([2,1,25,19],HD)
        for y in range(6,26):
            w=3 if y<20 else 2
            R(23,y,23+w,y+1,HD)
        R(24,24,26,27,HD)
    elif hair=='curly':
        for cx,cy,r in [(4,6,4),(8,3,4),(13,2,4),(18,3,4),(23,6,4),(3,12,4),(24,12,4),(4,17,3),(23,17,3)]: E([cx-r,cy-r,cx+r,cy+r],HD)
    elif hair=='bun':
        E([2,1,25,19],HD)
    elif hair=='crop':
        E([3,1,24,16],HD)
    else:
        E([2,1,25,19],HD)
    if outfit=='hoodie' and hood:
        b=[4,14,23,25] if hood=='s' else [3,12,24,26]
        E(b,'grey');E([b[0]+3,b[1]+3,b[2]-3,b[3]-1],'greyD')
    # ================= outfit (body) =================
    oy=breath+1
    OUT={'basic':dict(top=('white','wallS'),sleeve='short',bottom='pants',bc=('navy','navyD')),
         'knit':dict(top=('navy','navyD'),sleeve='long',bottom='pants',bc=('grey','greyD'),collar=True),
         'hoodie':dict(top=('grey','greyD'),sleeve='long',bottom='pants',bc=('navy','navyD'),hood=True),
         'librarian':dict(top=('white','wallS'),sleeve='long',bottom='pants',bc=('woodD','deep'),vest=('green','greenD')),
         'stripe':dict(top=('white','wallS'),sleeve='short',bottom='shorts',bc=('blue','navy'),stripe='navy'),
         'dress':dict(top=('pink','redD'),sleeve='short',bottom='skirt',bc=('pink','redD')),
         'overall':dict(top=('yellow','yellowD'),sleeve='short',bottom='pants',bc=('blue','navy'),overall=True),
         'coat':dict(top=('cream','wallD'),sleeve='long',bottom='pants',bc=('navy','navyD'),coat=True)}[outfit]
    T,TS=OUT['top'];BC,BS=OUT['bc']
    R(12,21,16,23+oy,'skinD')
    if OUT.get('hood'):
        R(9,21+oy,19,23+oy,T);R(10,21+oy,18,22+oy,TS)
    rows={22:(10,18),23:(8,20),24:(7,21),25:(7,21),26:(7,21)}
    for y,(a,z) in rows.items(): R(a,y+oy,z,y+1+oy,T)
    R(9,27+oy,19,32+oy,T)
    if OUT['sleeve']=='long':
        R(7,27+oy,9,31+oy,T);R(19,27+oy,21,31+oy,T);R(7,30+oy,9,31+oy,TS);R(19,30+oy,21,31+oy,TS)
        R(7,31+oy,9,32+oy,'skin');R(19,31+oy,21,32+oy,'skin')
    else:
        R(7,27+oy,9,32+oy,'skin');R(19,27+oy,21,32+oy,'skin');P(8,27+oy,'skinD');P(19,27+oy,'skinD')
        P(7,26+oy,TS);P(20,26+oy,TS)
    R(7,32+oy,9,33+oy,'skinD');R(19,32+oy,21,33+oy,'skinD')
    # neckline
    if not OUT.get('hood'):
        R(12,22+oy,16,23+oy,'skin');P(11,22+oy,TS);P(16,22+oy,TS)
    for y in range(24,32): P(18,y+oy,TS)
    R(9,31+oy,19,32+oy,TS)
    if OUT.get('stripe'):
        for y in range(24,32,2): R(7 if y<27 else 9,y+oy,21 if y<27 else 19,y+1+oy,OUT['stripe'])
    if OUT.get('collar'):
        R(11,22+oy,13,24+oy,'white');R(15,22+oy,17,24+oy,'white');P(12,24+oy,'white');P(15,24+oy,'white')
    if OUT.get('hood'):
        P(12,24+oy,'white');P(12,25+oy,'white');P(15,24+oy,'white');P(15,25+oy,'white');R(11,29+oy,17,31+oy,TS)
    if OUT.get('vest'):
        V,VS=OUT['vest'];R(9,24+oy,19,32+oy,V);R(13,24+oy,15,27+oy,'white');P(13,24+oy,'white')
        for y in range(25,32): P(18,y+oy,VS)
        for y in (27,29,31): P(14,y+oy,'yellow')
        R(9,31+oy,19,32+oy,VS)
    if OUT.get('overall'):
        R(10,27+oy,18,32+oy,BC);R(10,24+oy,12,27+oy,BC);R(16,24+oy,18,27+oy,BC);P(11,25+oy,'yellow');P(16,25+oy,'yellow')
        R(12,28+oy,16,30+oy,BS)
    if OUT.get('coat'):
        R(13,22+oy,15,32+oy,TS);P(11,22+oy,'white');P(16,22+oy,'white')
        R(9,30+oy,19,31+oy,'woodD');P(14,30+oy,'yellow')
        R(9,32+oy,19,36,T);R(9,35,19,36,TS);R(13,32+oy,15,36,TS)
    # bottoms
    if OUT['bottom']=='pants':
        y0=36 if OUT.get('coat') else 32+oy
        R(9,y0,19,38,BC);R(13,max(35,y0),15,38,BS)
        for y in range(y0,38): P(18,y,BS)
    elif OUT['bottom']=='shorts':
        R(9,32+oy,19,35,BC);R(13,34,15,35,BS);[P(18,y,BS) for y in range(32+oy,35)]
        R(10,35,13,38,'skin');R(15,35,18,38,'skin');P(12,35,'skinD');P(15,35,'skinD')
    elif OUT['bottom']=='skirt':
        R(9,32+oy,19,34,BC);R(8,34,20,36,BC);R(8,35,20,36,BS)
        R(10,36,13,38,'skin');R(15,36,18,38,'skin')
    R(10,38,13,40,'white');R(15,38,18,40,'white')
    shoe='redD' if outfit=='dress' else 'O'
    R(9,40,13,42,shoe);R(15,40,19,42,shoe);R(9,41,11,42,'grey');R(17,41,19,42,'grey')
    # ================= face (v7) =================
    rowsF={4:(9,19),5:(7,21),6:(6,22),7:(5,23),20:(5,23),21:(6,22),22:(8,20)}
    for y in range(8,20): rowsF[y]=(4,24)
    for y,(a,z) in rowsF.items(): R(a,y,z,y+1,'skin')
    # ================= front hair =================
    ears=False
    if hair=='m_basic':
        E([2,0,25,13],HB);fr=[11,12,11,10,11,12,11,10,10,11,12,11,10,10,11,12,11,10,11,12]
        side=[((3,24),7,14),((4,23),8,12)];ears=True
    elif hair=='f_bob':
        E([2,0,25,13],HB);fr=[12,12,11,11,10,10,11,11,10,10,10,11,11,10,10,11,11,12,12,13]
        side=[((3,4,23,24),8,21),((5,22),10,19)]
    elif hair=='crop':
        E([3,0,24,11],HB);fr=[9,9,8,9,9,8,9,9,8,8,9,9,8,9,9,8,9,9,8,9]
        side=[((3,24),6,11)];ears=True
    elif hair=='side':
        E([2,0,25,13],HB);fr=[10,9,9,8,8,8,9,9,10,10,11,11,12,12,12,12,13,13,13,13]
        side=[((3,24),7,14),((4,),8,11),((23,),8,15)];ears=True
    elif hair=='long':
        E([2,0,25,13],HB);fr=[12,12,11,11,10,10,11,11,10,10,10,11,11,10,10,11,11,12,12,13]
        side=[((3,4,23,24),8,22),((5,22),10,19)]
    elif hair=='pony':
        E([2,0,25,13],HB);fr=[11,11,10,10,11,10,10,11,10,10,11,10,10,11,10,10,11,11,12,12]
        side=[((3,24),7,15),((4,23),8,12)]
    elif hair=='curly':
        E([2,0,25,13],HB);fr=[11,9,10,11,9,10,11,9,10,11,10,9,11,10,9,11,10,9,10,11]
        side=[((3,24),6,16),((4,23),8,14)]
    elif hair=='bun':
        E([9,-5,18,3],HB);E([2,0,25,13],HB);fr=[12,12,11,11,10,10,11,11,10,10,10,11,11,10,10,11,11,12,12,13]
        side=[((3,24),7,16),((4,23),8,13)]
    for i,x in enumerate(range(4,24)):
        for y in range(2,fr[i]+1): P(x,y,HB)
    for xs,y0,y1 in side:
        for x in xs:
            for y in range(y0,y1+1): P(x,y,HB)
    if hair=='long':
        for x in (3,4,23,24):
            for y in range(22,31): P(x,y,HB)
        P(3,31,HD);P(24,31,HD)
    if ears:
        for y in (13,14,15): P(2,y,'skin');P(25,y,'skin')
        P(2,14,'skinD');P(25,14,'skinD')
    for i in range(1,19):
        if fr[i]<fr[i-1] and fr[i]<=fr[i+1]:
            for y in range(fr[i]-2,fr[i]+1): P(4+i,y,HD)
    for i,x in enumerate(range(4,24)):
        if (i==0 or fr[i]>fr[i-1]) and (i==19 or fr[i]>=fr[i+1]): P(x,fr[i],HD)
    for x,y in [(7,3),(8,2),(9,2),(10,1),(11,1),(12,1),(6,4),(7,4)]: P(x,y,HL)
    if hair in('m_basic','side'): P(15,2,HD);P(16,3,HD);P(19,4,HD);P(14,0,HB);P(15,0,HB)
    if hair=='side':
        for y in range(1,9): P(8,y,HD)
    if hair=='curly':
        for (bx,by) in [(5,5),(9,2),(14,1),(19,2),(23,5),(3,10),(24,10),(7,8),(12,7),(17,7),(21,8)]:
            E([bx-2,by-2,bx+2,by+2],HB);P(bx-1,by+2,HD);P(bx,by+2,HD);P(bx+1,by+2,HD);P(bx-1,by-1,HL);P(bx,by-1,HL)
    if hair=='bun':
        P(11,-3,HL);P(12,-4,HL);R(11,2,17,3,'red');P(11,2,'redD')
    if hair=='pony':
        R(23,8,25,10,'red')
    for i,x in enumerate(range(4,24)):
        y=fr[i]+1
        if G(x,y)[:3]==K['skin']: P(x,y,'skinD')
    # ================= features =================
    ey=14
    for x0 in (8,17): R(x0,ey,x0+2,ey+3,'O');P(x0,ey,'white')
    R(5,ey+4,8,ey+5,'pink');R(20,ey+4,23,ey+5,'pink')
    R(13,ey+6,15,ey+7,'redD')
    # outline
    a=im.load();m=[[a[x,y][3]>0 for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if not m[y][x] and any(0<=x+dx<W and 0<=y+dy<H and m[y+dy][x+dx] for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): a[x,y]=c('O')
    if OUT['sleeve']=='short' and not OUT.get('overall') and not OUT.get('vest'):
        for y in range(28+breath,33+breath): P(9,y,TS);P(18,y,TS)
    return im
HAIRS=[('m_basic','기본 남성 (v7)'),('f_bob','기본 여성 (v7)'),('crop','짧은 크롭'),('side','옆가르마'),('long','긴 생머리'),('pony','포니테일'),('curly','곱슬 파마'),('bun','올림 똥머리')]
# 순서 = 해금 순서 (0, 20, 40, 60, 100, 150, 250, 400권)
OUTFITS=[('basic','기본 유니폼','흰 반팔 티 + 남색 바지'),('knit','니트','남색 니트, 흰 셔츠 깃'),('hoodie','후드티','회색 후드, 흰 끈'),
         ('stripe','줄무늬 티','줄무늬 반팔 + 반바지'),('librarian','사서 조끼','흰 셔츠 + 초록 조끼'),('dress','원피스','분홍 원피스 + 구두'),('overall','멜빵바지','노란 티 + 파란 멜빵'),('coat','트렌치코트','베이지 코트 + 벨트')]
def sheet(items,fname,title,pair=False):
    S=7;cw=300 if not pair else 340;ch=H*S+110
    out=Image.new('RGB',(cw*4+20,ch*2+70),(246,244,238));d=ImageDraw.Draw(out)
    fb=fonts.get(24,True)
    fr=fonts.get(16)
    d.text((20,14),title,fill=(27,22,38),font=fb)
    for i,it in enumerate(items):
        gx,gy=20+(i%4)*cw,60+(i//4)*ch
        d.text((gx,gy),f'{i+1}. {it[1]}',fill=(27,22,38),font=fb)
        if len(it)>2: d.text((gx,gy+32),it[2],fill=(98,98,110),font=fr)
        if pair:
            for j,hh in enumerate(('m_basic','f_bob')):
                im=make(hh,it[0]);big=im.resize((W*5,H*5),Image.NEAREST);out.paste(big,(gx+j*150,gy+62),big)
        else:
            im=make(it[0]);big=im.resize((W*S,H*S),Image.NEAREST);out.paste(big,(gx,gy+50),big)
            sm=im.resize((W*2,H*2),Image.NEAREST);out.paste(sm,(gx+W*S+10,gy+50+H*S-H*2),sm)
    out.save(fname)
def hood_sheet():
    out=Image.new('RGB',(1240,600),(246,244,238));d=ImageDraw.Draw(out)
    fb=fonts.get(24,True)
    fr=fonts.get(16)
    for i,(hv,lab,desc) in enumerate([(None,'지금','후드가 목 뒤에 가려짐'),('s','A. 작은 후드','턱 양옆과 어깨 위로 살짝'),('l','B. 큰 후드','머리 뒤로 둥글게 크게')]):
        gx=20+i*410
        d.text((gx,14),lab,fill=(27,22,38),font=fb);d.text((gx,46),desc,fill=(98,98,110),font=fr)
        for j,hh in enumerate(('m_basic','f_bob')):
            im=make(hh,'hoodie',hood=hv);big=im.resize((W*6,H*6),Image.NEAREST);out.paste(big,(gx+j*190,80),big)
            out.paste(im.resize((W*2,H*2),Image.NEAREST),(gx+j*190+60,400),im.resize((W*2,H*2),Image.NEAREST))
    d.text((20,520),'아래 작은 그림이 실제 크기의 2배입니다. 후드는 뒷머리 위, 얼굴 뒤 레이어에 그렸습니다.',fill=(98,98,110),font=fr)
    out.save(fonts.out('hoodie-hood-test.png'))
if __name__=='__main__':
    hood_sheet()
    sheet(HAIRS,fonts.out('avatar-v7-hair8.png'),'v7 기반 헤어 바리에이션 8종 (얼굴·비율·기본 유니폼 동일)')
    sheet(OUTFITS,fonts.out('avatar-v7-outfit8.png'),'옷 디자인 시안 8종 (남녀 같은 옷)',pair=True)
    print('ok')
