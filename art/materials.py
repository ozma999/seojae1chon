import fonts
from PIL import Image, ImageDraw, ImageFont
import math
MW,MH=56,42;WALLH=26
def h(x,y,s=0): return ((x*73856093)^(y*19349663)^(s*83492791))&0xffff
def hx(c):
    c=c.lstrip('#')
    if len(c)==3: c=''.join(ch*2 for ch in c)
    return tuple(int(c[i:i+2],16) for i in (0,2,4))
# ---------- pattern functions return palette index 0..3 ----------
def plain(x,y,s):   return 1 if h(x,y,s)%23==0 else 0
def vstripe(x,y,s): return 1 if x%6 in(0,1) else 0
def vplank(x,y,s):  return 2 if x%7==0 else (1 if (y+h(x//7,0,s)%9)%13==0 else 0)
def hplank(x,y,s):  return 2 if y%5==0 else (2 if (x+(y//5)*11)%17==0 else (1 if h(x,y,s)%17==0 else 0))
def brick(x,y,s):
    row=y//5;off=(row%2)*5
    return 2 if y%5==0 or (x+off)%10==0 else (1 if h(x//10,row,s)%3==0 else 0)
def stone(x,y,s):
    row=y//7;off=h(row,0,s)%9
    w=8+h((x+off)//9,row,s)%5
    return 2 if y%7==0 or (x+off)%w==0 else (1 if h(x,y,s)%9==0 else 0)
def tile(x,y,s):    return 2 if x%8==0 or y%8==0 else 0
def check(x,y,s):   return 1 if (x//6+y//6)%2 else 0
def marble(x,y,s):
    v=math.sin(x*0.25+y*0.12+3*math.sin(y*0.2+s))
    return 2 if abs(v)<0.08 else (1 if abs(v)<0.25 and h(x,y,s)%3 else 0)
def panel(x,y,s):
    if x%14==0 or y%13==0: return 2
    if (x%14 in(2,12)) and (y%13 in(2,11)): return 3
    return 1 if y%13==1 else 0
def dots(x,y,s):    return 1 if x%6==((y//6)%2)*3 and y%6==2 else 0
def diamond(x,y,s): return 1 if (x+y)%8==0 or (x-y)%8==0 else 0
def floral(x,y,s):
    cx,cy=x%10,y%10
    if (cx,cy) in((5,4),(4,5),(6,5),(5,6)): return 1
    if (cx,cy)==(5,5): return 3
    return 0
def rings(x,y,s):
    d=math.hypot(x-28,(y-40)*1.6);return 2 if int(d)%5==0 else (1 if int(d)%5==1 else 0)
def bark(x,y,s):    return 2 if (x+h(0,y//6,s)%3)%5==0 else (1 if (x*3+y)%11==0 else 0)
def leaves(x,y,s):
    v=h(x//3,y//3,s)%7;return 2 if v==0 else (1 if v<3 else 0)
def grass(x,y,s):   return 2 if (x*7+h(x,0,s))%5==0 and y%4<3 else (1 if (x+y*3)%7==0 else 0)
def hexg(x,y,s):
    row=y//6;off=(row%2)*4
    return 2 if y%6==0 and (x+off)%8<4 or (x+off)%8==0 else 0
def circuit(x,y,s):
    return 2 if (y%9==0 and h(x//6,y,s)%3) or (x%11==0 and h(x,y//7,s)%2) else (3 if h(x,y,s)%61==0 else 0)
def starsp(x,y,s):  return 3 if h(x,y,s)%41==0 else (1 if h(x,y,s+1)%97==0 else 0)
def clouds(x,y,s):
    v=math.sin(x*0.3+math.sin(y*0.5)*2)+math.sin(y*0.4+x*0.1);return 1 if v>1.1 else 0
def waves(x,y,s):   return 1 if (y+int(2*math.sin(x*0.5)))%6==0 else 0
def hanji(x,y,s):   return 2 if x%12==0 or y%12==0 else (1 if h(x,y,s)%29==0 else 0)
def logs(x,y,s):    return 2 if y%6==0 else (1 if y%6==1 else 0)
def ice(x,y,s):     return 2 if (x+ (y//8)%2*6)%12==0 or y%8==0 else (3 if (x+y)%9==0 and h(x,y,s)%2 else 0)
def sand(x,y,s):    return 1 if (y+int(1.5*math.sin(x*0.3)))%5==0 else (2 if h(x,y,s)%31==0 else 0)
def candy(x,y,s):   return 1 if (x+y)%10<5 else 0
def cardboard(x,y,s): return 1 if x%3==0 else (2 if y==12 else 0)
def quilt(x,y,s):   return 2 if (x+y)%10==0 or (x-y)%10==0 else 0
def neon(x,y,s):    return 3 if x%9==0 or y%9==0 else 0
def chalk(x,y,s):   return 1 if h(x,y,s)%53==0 else (3 if y in(8,9) and 6<x<30 and x%3 else 0)
def glass(x,y,s):   return 2 if x%10==0 or y%9==0 else (1 if (x-y)%13==0 else 0)
def tatami(x,y,s):  return 2 if x%16==0 or y%9==0 else (1 if x%2==0 else 0)
def carpet(x,y,s):  return 2 if x%28<2 or y%10<1 else (1 if (x+y)%4==0 else 0)
def grate(x,y,s):   return 2 if x%4==0 or y%4==0 else 0
def moss(x,y,s):    v=h(x//2,y//2,s)%5;return 1 if v==0 else (2 if v==1 else 0)
def coral(x,y,s):   v=math.sin(x*0.5)*math.cos(y*0.4);return 1 if v>0.5 else (3 if h(x,y,s)%37==0 else 0)
def dancheong(x,y,s):
    yy=y%13;return 1 if yy<2 else (2 if yy<4 else (3 if yy in(6,7) and x%6<3 else 0))
def books(x,y,s):
    if y%10 in(0,1): return 2
    return 1 if h(x//3,y//10,s)%3 else 3
P=lambda *c:[hx(x) for x in c]
MATS=[
('나무 판자','vplank',P('#c9965e','#b8844e','#7a5233','#e0b480'),'hplank',P('#b8824f','#a8723f','#7c5230','#d4a070')),
('대리석','marble',P('#eeeae4','#d8d2cc','#a49c98','#fff'),'marble',P('#e4dfd8','#cfc8c0','#8c8480','#fff')),
('검은 대리석','marble',P('#2e2c34','#3e3c46','#a49cb0','#fff'),'tile',P('#26242c','#34323c','#8a84a0','#fff')),
('성벽','stone',P('#a8a29a','#968f86','#5c5650','#c8c2b8'),'stone',P('#8e887e','#7e776c','#4c4740','#aaa')),
('붉은 벽돌','brick',P('#b85a44','#a44c3a','#e8d8c4','#d07058'),'hplank',P('#8a5a3a','#7a4c30','#4c3020','#a06c48')),
('흰 벽돌','brick',P('#ece6dc','#ddd6ca','#b4aca0','#fff'),'tile',P('#9aa0a6','#8a9096','#60666c','#bbb')),
('장난감 플라스틱','panel',P('#f6d84a','#f0c830','#e05a3c','#3c78d8'),'check',P('#3c78d8','#e05a3c','#203060','#fff')),
('우주선','panel',P('#b8c0cc','#a6aebc','#5c6474','#7ef9ff'),'grate',P('#6c7484','#5c6474','#3c4250','#7ef9ff')),
('나무 속','rings',P('#c89a60','#b88850','#8a5c34','#e0b880'),'rings',P('#b8884c','#a87840','#7c5430','#d4a464')),
('나무껍질','bark',P('#7a5a3e','#6a4c32','#4a3420','#9a7454'),'moss',P('#5a7a3e','#4a6a32','#7a9a54','#fff')),
('풀숲','grass',P('#78b858','#68a848','#4a8a3a','#a8d878'),'grass',P('#6aa84a','#5a983a','#3e7a2e','#98c868')),
('숲속','leaves',P('#4a8a4a','#3e7a3e','#2a5a30','#78b060'),'moss',P('#6a5a3e','#5a4a32','#4a7a3a','#fff')),
('한지와 장판','hanji',P('#f2ead6','#e4dac2','#c8b896','#fff'),'tatami',P('#e8c468','#dcb456','#b48a38','#f4d88a')),
('다다미','vstripe',P('#efe4c8','#e2d4b2','#bfae8a','#fff'),'tatami',P('#c8c47a','#b8b46a','#8a8648','#dedb98')),
('단청','dancheong',P('#e8dcc4','#3a7a6a','#c84a3a','#f0c040'),'hplank',P('#a87a50','#986a42','#6a4a2e','#c49464')),
('빈티지 벽지','floral',P('#e6d4c0','#c46a6a','#d8c4ae','#5a8a5a'),'carpet',P('#8a3a3a','#7a2e2e','#e0c080','#fff')),
('물방울 벽지','dots',P('#cfe4f0','#f6f8fa','#a8c4d4','#fff'),'hplank',P('#d8b888','#c8a878','#9c7c50','#ecd0a0')),
('다이아 벽지','diamond',P('#e4dcc8','#c8b89a','#a8987a','#fff'),'check',P('#e8e0d0','#3a3a46','#20202a','#fff')),
('줄무늬 벽지','vstripe',P('#a8c8b0','#94b89e','#6a9076','#fff'),'hplank',P('#a87a50','#986a42','#6a4a2e','#c49464')),
('파스텔 줄무늬','vstripe',P('#f6d4dc','#f8e8ec','#e0b0bc','#fff'),'check',P('#f8e8ec','#d8c0f0','#a890c0','#fff')),
('통나무 오두막','logs',P('#a8743e','#c48c54','#6a4422','#d8a46c'),'hplank',P('#8a5c32','#7a4e28','#4c3018','#a87448')),
('얼음 동굴','ice',P('#c8e8f4','#b4dcec','#8cc0d8','#fff'),'ice',P('#d8f0f8','#c0e4f0','#98c8dc','#fff')),
('사막 사암','sand',P('#e0b880','#d0a46c','#b8885a','#fff'),'sand',P('#e8c890','#d8b47c','#c09860','#fff')),
('동굴 암벽','stone',P('#6c6460','#5c5450','#3a3430','#8a827c'),'moss',P('#5a5450','#4a4440','#6a7a4a','#fff')),
('바닷속','waves',P('#3a8acc','#5aa4dc','#2a6aa8','#fff'),'coral',P('#e0c890','#e8806a','#c8a870','#f8f0d0')),
('캔디','candy',P('#f8f0f4','#f4a0b8','#e07090','#fff'),'check',P('#f4c8d8','#c8e8d0','#a0c8b0','#fff')),
('구름 위','clouds',P('#a8d8f4','#f6fafc','#88c0e8','#fff'),'clouds',P('#e8f4fa','#fdfeff','#c8dcea','#fff')),
('밤하늘','starsp',P('#1e2448','#3a4478','#141830','#f8f0c0'),'starsp',P('#262c54','#3a4478','#181c38','#f8f0c0')),
('상자 속','cardboard',P('#c8a070','#b88e60','#8a6a44','#e0bc8c'),'cardboard',P('#b88e60','#a87e50','#7a5a38','#d0ac7c')),
('온실 유리','glass',P('#c8e4d8','#e8f4ee','#5a8a6a','#fff'),'tile',P('#9aa88a','#8a987a','#5a6a4a','#bcc8a8')),
('네온 사이버','neon',P('#1a1430','#241c40','#10101c','#e04ab0'),'neon',P('#141020','#1e1830','#0c0a14','#4ae0e0')),
('칠판 교실','chalk',P('#2e5a44','#d8e4dc','#1e4030','#e8f0e0'),'hplank',P('#b8824f','#a8723f','#7c5230','#d4a070')),
('누빔 패브릭','quilt',P('#e8c8a8','#dab89a','#b89478','#fff'),'carpet',P('#5a6aa0','#4a5a90','#e0d0a0','#fff')),
('육각 타일','hexg',P('#f0ece4','#e0dcd4','#a8a49c','#fff'),'hexg',P('#3a8a7a','#2e7a6a','#1e5a4c','#fff')),
('회로 기판','circuit',P('#2a6a3a','#225a30','#d8c060','#e8e0a0'),'grate',P('#3a3a44','#2e2e38','#1a1a22','#d8c060')),
('철제 공장','panel',P('#8a8e94','#7a7e84','#4a4e54','#c8a040'),'grate',P('#5a5e64','#4a4e54','#2a2e34','#c8a040')),
('황금 궁전','marble',P('#f0d890','#e4c470','#b08a38','#fff8d0'),'check',P('#e8d4a0','#a83a3a','#702424','#fff')),
('보랏빛 마법탑','stone',P('#6a4a8a','#5a3c7a','#3a2650','#c8a0f0'),'starsp',P('#3a2a50','#4a3a64','#2a1e3c','#e8d0ff')),
('도서관 서가','books',P('#7a4a2e','#c8483c','#5a3420','#3c6eb4'),'carpet',P('#8a3a3a','#7a2e2e','#d8b870','#fff')),
('지하철 타일','tile',P('#f4f2ec','#e8e4dc','#9aa4aa','#fff'),'tile',P('#a8a8a0','#989890','#6a6a64','#ccc')),
('욕실 타일','tile',P('#a8d8d8','#98c8c8','#f4f8f8','#fff'),'check',P('#f4f8f8','#a8d8d8','#7ab0b0','#fff')),
('콘크리트','plain',P('#a8a8a4','#989894','#6a6a66','#ccc'),'plain',P('#949490','#848480','#5a5a56','#bbb')),
('목욕탕','tile',P('#e8f0f4','#d8e4ec','#8ab0c8','#fff'),'tile',P('#7ab0c8','#6aa0b8','#3e7088','#fff')),
('선실','vplank',P('#3a5a8a','#4a6a9a','#223a60','#e8e0c8'),'hplank',P('#c89a6a','#b88a5a','#8a6040','#e0b888')),
('캠핑 텐트','vstripe',P('#e8a04a','#f0b45c','#b87430','#fff'),'grass',P('#6aa84a','#5a983a','#3e7a2e','#98c868')),
('이글루','ice',P('#f4f8fa','#e4eef4','#b4c8d8','#fff'),'ice',P('#e8f0f4','#d8e4ec','#a8bccc','#fff')),
('흙벽 초가','plain',P('#c8a478','#b89468','#8a6c48','#e0c094'),'hplank',P('#a87a50','#986a42','#6a4a2e','#c49464')),
('대나무 숲','vstripe',P('#8ab868','#78a858','#4a7a3a','#c8e098'),'moss',P('#6a8a4a','#5a7a3e','#8aaa5a','#fff'),),
('벚꽃 정원','floral',P('#f8e4ea','#f0a8bc','#e8d0d8','#8ac08a'),'grass',P('#88b868','#78a858','#5a8a46','#f4b8c8')),
('단풍 산장','logs',P('#a86a3a','#c4824c','#6a3e1e','#e8a050'),'leaves',P('#c86a3a','#d8884a','#8a3e22','#f0c060')),
('해변 오두막','vplank',P('#e8f0f4','#d4e0e8','#8aa4b8','#fff'),'sand',P('#f0dcb0','#e4cc9c','#c8ac78','#fff')),
('스테인드글라스','glass',P('#3a5a9a','#c84a5a','#1e2a4a','#f0c040'),'stone',P('#8a8478','#7a7468','#4c4840','#aaa')),
('체스판','check',P('#e8e4dc','#2a2a32','#1a1a20','#fff'),'check',P('#f0ece4','#26262e','#16161c','#fff')),
('레트로 오락실','neon',P('#2a1a4a','#3a2a60','#1a1030','#f0e040'),'check',P('#2a1a4a','#e04a6a','#1a1030','#fff')),
('비밀기지','panel',P('#5a6a4a','#4e5e40','#2e3a26','#e0c050'),'grate',P('#4a4e44','#3e4238','#26281e','#e0c050')),
('과자 집','candy',P('#e8b878','#f4e4c8','#a8743e','#fff'),'check',P('#c8844a','#f4e4c8','#8a5a30','#fff')),
('수족관','waves',P('#2a7aaa','#4a9aca','#1a5a8a','#fff'),'tile',P('#d8e8ec','#c8d8dc','#90a8b0','#fff')),
('화산 동굴','stone',P('#4a3430','#3a2824','#e05a2a','#f0a040'),'stone',P('#3a2a26','#2e201c','#c84a20','#f0a040')),
('구름 궁전','clouds',P('#f0e8f8','#ffffff','#d0c4e4','#fff'),'marble',P('#f4f0fa','#e4dcf0','#b8acd0','#fff')),
('은하 열차','panel',P('#6a3a3a','#7a4646','#3a1e1e','#f0c060'),'carpet',P('#3a3a6a','#2e2e5a','#d8b860','#fff')),
('식물 연구소','glass',P('#d8ecd4','#eef8ec','#6a9a6a','#fff'),'tile',P('#e8ece4','#d8dcd4','#9aa494','#fff')),
('비 오는 다락','vplank',P('#8a7a6a','#7a6a5a','#4a3e34','#aaa'),'hplank',P('#7a6450','#6a5644','#463828','#94806a')),
('한옥 마루','hanji',P('#f4ecd8','#e6dcc4','#8a6a44','#fff'),'hplank',P('#c89a64','#b88a54','#7a5a36','#e0b480')),
('픽셀 그리드','tile',P('#f4f4f4','#e8e8e8','#c8c8d4','#fff'),'tile',P('#e0e0e8','#d0d0d8','#a8a8b8','#fff')),
]
assert len(MATS)==64,len(MATS)
def render(m):
    name,wf,wc,ff,fc=m;im=Image.new('RGB',(MW,MH));px=im.load();s=sum(map(ord,name))
    fw=globals()[wf];fl=globals()[ff]
    for y in range(WALLH):
        for x in range(MW): px[x,y]=wc[fw(x,y,s)]
    # baseboard
    for x in range(MW): px[x,WALLH]=tuple(int(c*.6) for c in wc[2]);px[x,WALLH+1]=(27,22,38)
    vx=MW/2
    for y in range(WALLH+2,MH):
        v=(y-WALLH-2)/(MH-WALLH-2);sc=0.5+0.9*v
        for x in range(MW):
            u=int(vx+(x-vx)/sc);z=int((y-WALLH)*1.6/(0.6+0.6*v))
            c=fc[fl(u%200,z,s)]
            px[x,y]=tuple(int(cc*(0.82+0.18*v)) for cc in c)
    # side shading
    for y in range(MH):
        for x in (0,1,MW-2,MW-1): px[x,y]=tuple(int(c*.85) for c in px[x,y])
    return im
def sheet():
    S=3;cw=MW*S+18;ch=MH*S+46;cols=8
    out=Image.new('RGB',(cw*cols+20,ch*8+20),(246,244,238));d=ImageDraw.Draw(out)
    f=fonts.get(17,True)
    for i,m in enumerate(MATS):
        im=render(m).quantize(colors=10,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
        gx,gy=10+(i%cols)*cw,10+(i//cols)*ch
        d.rectangle([gx-2,gy-2,gx+MW*S+1,gy+MH*S+1],fill=(27,22,38))
        out.paste(im.resize((MW*S,MH*S),Image.NEAREST),(gx,gy))
        d.text((gx,gy+MH*S+6),f'{i+1:02d} {m[0]}',fill=(27,22,38),font=f)
    out.save(fonts.out('materials-64.png'));print(out.size)
if __name__=='__main__':
    sheet()
