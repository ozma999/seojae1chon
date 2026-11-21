# 서재일촌 로고: '책으로 지은 집' 아이콘(16×16) + 갈무리 굵은 글씨(OFL, fonts/)
# 실행: python3 brand.py → ../public/brand/, ../src/app/icon.png, apple-icon.png
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from lib import PAL32 as K
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype(os.path.join(HERE, 'fonts', 'Galmuri11-Bold.ttf'), 12)
OUT = os.path.join(HERE, '..', 'public', 'brand'); APP = os.path.join(HERE, '..', 'src', 'app')
os.makedirs(OUT, exist_ok=True)
def icon(c):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    P = lambda x, y, k: im.putpixel((x, y), K[k] + (255,))
    O = c['ol']
    # 지붕: 서로 기댄 책 두 권(표지 2px + 책장 면 1px, 양쪽 외곽선)
    for i in range(7):
        y = 8 - i
        for x, k in ((i, O), (i + 1, c['roofL']), (i + 2, c['roofL']), (i + 3, 'white'), (i + 4, O)):
            if x <= 7: P(x, y, k)
        for x, k in ((15 - i, O), (14 - i, c['roofR']), (13 - i, c['roofR']), (12 - i, 'white'), (11 - i, O)):
            if x >= 8: P(x, y, k)
    for x in (6, 7, 8, 9): P(x, 1, O)
    # 몸: 책장 + 책등 4권
    d.rectangle([2, 8, 13, 15], fill=K[O]); d.rectangle([3, 9, 12, 14], fill=K[c['wall']])
    for x, k in zip((4, 6, 8, 10), c['spines']):
        d.rectangle([x, 10, x + 1, 14], fill=K[k])
    return im
def logo(c):
    """아이콘 + 글씨, 2배 크기(높이 32px). 화면에서는 image-rendering: pixelated 로 키운다"""
    ic = icon(c).resize((32, 32), Image.NEAREST)
    tw = int(F.getlength('서재일촌')) + 2
    txt = Image.new('RGBA', (tw, 14), (0, 0, 0, 0)); td = ImageDraw.Draw(txt); td.fontmode = '1'
    td.text((0, 0), '서재일촌', font=F, fill=K[c['word']] + (255,))
    txt = txt.resize((tw * 2, 28), Image.NEAREST)
    out = Image.new('RGBA', (32 + 8 + tw * 2, 32), (0, 0, 0, 0))
    out.alpha_composite(ic, (0, 0)); out.alpha_composite(txt, (40, 4))
    return out
def app_icon(c, size, bg):
    """바탕을 채운 정사각 아이콘(홈 화면용). 픽셀 배수로 키우고 가운데 정렬"""
    k = max(1, int(size * 0.75) // 16)
    im = Image.new('RGBA', (size, size), bg + (255,))
    ic = icon(c).resize((16 * k, 16 * k), Image.NEAREST)
    im.alpha_composite(ic, ((size - 16 * k) // 2, (size - 16 * k) // 2))
    return im
C = dict(ol='O', roofL='red', roofR='teal', wall='cream', spines=['yellow', 'navy', 'red', 'green'], word='O')
NIGHT = dict(C, word='cream')    # 어두운 바탕용 글씨
PAPER = (243, 234, 214)
logo(C).save(os.path.join(OUT, 'logo.png'))
logo(NIGHT).save(os.path.join(OUT, 'logo-night.png'))
icon(C).resize((64, 64), Image.NEAREST).save(os.path.join(OUT, 'icon-64.png'))
for s in (192, 512): app_icon(C, s, PAPER).save(os.path.join(OUT, f'icon-{s}.png'))
icon(C).resize((32, 32), Image.NEAREST).save(os.path.join(APP, 'icon.png'))        # 파비콘
app_icon(C, 180, PAPER).convert('RGB').save(os.path.join(APP, 'apple-icon.png'))  # iOS 홈 화면
print('brand ok')
