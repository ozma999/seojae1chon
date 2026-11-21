# 첫 화면용 '서재마을' GIF 시안: Lv.1→4, 레벨마다 캐릭터가 늘어난다(서재산책으로 친구들이 놀러 온 느낌)
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rooms
from avatar9 import make
from PIL import Image
orig = rooms.mkscene
def mk(*a, **k):
    s = orig(*a, **k); s.nobooks = False; return s     # 책을 채운 방
rooms.mkscene = mk
# (hair, outfit, foot_x, foot_y) — 레벨마다 사람이 늘어난다. 계단 위 사람은 디딤판(앞면 위 4px) 높이에 발을 둔다
CAST = [
    [(0, 0, 144, 205)],
    [(0, 0, 192, 268), (1, 3, 150, 262)],
    [(0, 0, 268, 341), (4, 4, 210, 352), (6, 2, 330, 346), (1, 5, 380, 358)],
    [(0, 0, 404, 486), (4, 4, 330, 500), (6, 2, 470, 498), (1, 5, 560, 520), (5, 6, 250, 470), (7, 7, 640, 500), (2, 1, 300, 545), (3, 3, 223, 287)]   # 계단 8번째 칸 디딤판 위에 선다,
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'brand')
os.makedirs(OUT, exist_ok=True)
frames = []
for li, bld in enumerate(rooms.LEVELS):
    s, items, foot = bld('attic')
    lays = rooms.item_layers(s, items)
    mask = rooms.glass_mask(s)
    im = s.im.convert('RGBA')
    for xy, w in rooms.window_imgs(s, mask, '바다', '낮'): im.alpha_composite(w, xy)
    for L in lays:
        if L['kind'] == 'wall': im.alpha_composite(L['im'], (L['x'], L['y']))
    people = [(fy, make(['m_basic','f_bob','crop','side','long','pony','curly','bun'][h], ['basic','knit','hoodie','stripe','librarian','dress','overall','coat'][o], hood='s' if o == 2 else None), fx)
              for h, o, fx, fy in CAST[li]]
    things = [(L['base'], 'item', L) for L in lays if L['kind'] == 'floor'] + [(fy, 'person', (a, fx)) for fy, a, fx in people]
    for base, kind, obj in sorted(things, key=lambda t: (t[0], t[1] == 'person')):
        if kind == 'item': im.alpha_composite(obj['im'], (obj['x'], obj['y']))
        else:
            a, fx = obj; im.alpha_composite(a, (fx - a.width // 2, base - a.height + 1))
    im = im.convert('RGB')
    frames.append(im.resize((768, 576), Image.NEAREST))
# GIF: 레벨마다 1.6초, 마지막 2.4초
pal = frames[-1].quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
frames[-1].resize((384, 288), Image.NEAREST).save(os.path.join(OUT, 'village-lv4.png'))   # 움직임 줄이기용
# 휴대폰 표시 크기(384px)
small = [f.resize((384, 288), Image.NEAREST).quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
small[0].save(os.path.join(OUT, 'village.gif'), save_all=True, append_images=small[1:], duration=[1600, 1600, 1600, 2400], loop=0, optimize=True)
print({f: os.path.getsize(os.path.join(OUT, f)) // 1024 for f in ['village.gif', 'village-lv4.png']}, 'KB')
