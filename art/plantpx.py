# 방 그림과 같은 도트 규칙으로 식물을 그리는 도구
#  - 면은 2~3톤(바탕·그늘·빛) 평면 채색, 잡티(랜덤 점) 없음
#  - 잎·화분·줄기 하나하나에 1px 먹색(O) 외곽선 → 겹쳐도 잎이 또렷
#  - 빛은 왼쪽 위에서. 그늘은 오른쪽 아래 반쪽, 빛은 왼쪽 위 가장자리 1px
#  - 바닥 그림자는 방 가구처럼 점선
import math, random, sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from lib import PAL32

C = dict(PAL32)
C.update(leafL=(156, 200, 100), sage=(128, 164, 132), moss=(36, 82, 58), mossD=(24, 56, 44))
# 잎 톤 묶음(그늘, 바탕, 빛)
T_GREEN = ('greenD', 'green', 'leafL')
T_DEEP = ('moss', 'greenD', 'green')
T_DARK = ('mossD', 'moss', 'greenD')
T_SAGE = ('greenD', 'sage', 'white')
T_LIME = ('green', 'leafL', 'cream')
T_TEAL = ('greenD', 'teal', 'skyL')

def rgba(k): return C[k] + (255,)

def _c(k): return k if isinstance(k, tuple) else rgba(k)
class Spr:
    def __init__(s, w, h, ox=0, oy=0):
        s.ox, s.oy = int(ox), int(oy); s.W, s.H = w + 2 * s.ox, h + s.oy
        s.im = Image.new('RGBA', (s.W, s.H), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im)
    def Praw(s, x, y, k):
        if 0 <= x < s.W and 0 <= y < s.H: s.im.putpixel((int(x), int(y)), _c(k))
    def P(s, x, y, k): s.Praw(int(round(x)) + s.ox, int(round(y)) + s.oy, k)
    def clear(s, x, y): s.Praw(int(round(x)) + s.ox, int(round(y)) + s.oy, (0, 0, 0, 0))
    def get(s, x, y):
        X, Y = int(round(x)) + s.ox, int(round(y)) + s.oy
        return s.im.getpixel((X, Y)) if 0 <= X < s.W and 0 <= Y < s.H else (0, 0, 0, 0)
    def R(s, x0, y0, x1, y1, k):
        x0, y0, x1, y1 = map(lambda v: int(round(v)), (x0, y0, x1, y1))
        if x1 > x0 and y1 > y0: s.d.rectangle([x0 + s.ox, y0 + s.oy, x1 - 1 + s.ox, y1 - 1 + s.oy], fill=_c(k))
    def poly(s, pts, k): s.d.polygon([(round(x) + s.ox, round(y) + s.oy) for x, y in pts], fill=_c(k))
    def ell(s, x0, y0, x1, y1, k): s.d.ellipse([round(x0) + s.ox, round(y0) + s.oy, round(x1) + s.ox, round(y1) + s.oy], fill=_c(k))
    def line(s, a, b, k, w=1): s.d.line([(round(a[0]) + s.ox, round(a[1]) + s.oy), (round(b[0]) + s.ox, round(b[1]) + s.oy)], fill=_c(k), width=w)
    def layer(s):
        L = Spr(1, 1); L.ox, L.oy, L.W, L.H = s.ox, s.oy, s.W, s.H
        L.im = Image.new('RGBA', (s.W, s.H), (0, 0, 0, 0)); L.d = ImageDraw.Draw(L.im); return L
    def paste(s, im, cx, yb):
        bb = im.getbbox(); im = im.crop(bb); s.im.alpha_composite(im, (int(cx - im.width / 2) + s.ox, int(yb - im.height) + s.oy))
    def trim(s): return s.im.crop(s.im.getbbox())
    def put(s, L, outline=True, dx=0, dy=0):
        if outline: L.outline()
        s.im.alpha_composite(L.im, (dx, dy))
    def outline(s, k='O'):
        a = s.im.split()[3].load(); px = s.im.load(); add = []
        for y in range(s.H):
            for x in range(s.W):
                if a[x, y]: continue
                if any(0 <= x + dx < s.W and 0 <= y + dy < s.H and a[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
        for x, y in add: px[x, y] = rgba(k)
        return s
    def shade(s, tones, light=(-1, -1), cx=None, cy=None, hi=True, d=None):
        """칠해진 부분을 3톤으로: 빛 반대쪽(오른쪽 아래) 초승달 = 그늘, 빛 쪽 가장자리 1px = 빛."""
        al = s.im.split()[3]; a = al.load(); px = s.im.load()
        bb = al.getbbox()
        if not bb: return s
        w, h = bb[2] - bb[0], bb[3] - bb[1]; d = d or max(1, round(min(w, h) * .2))
        ins = lambda x, y: 0 <= x < s.W and 0 <= y < s.H and a[x, y]
        pts = [(x, y) for y in range(bb[1], bb[3]) for x in range(bb[0], bb[2]) if a[x, y]]
        for x, y in pts:
            px[x, y] = rgba(tones[1] if ins(x - light[0] * d, y - light[1] * d) else tones[0])
        if hi:
            for x, y in pts:
                if not ins(x + light[0], y + light[1]) and ins(x - light[0] * d, y - light[1] * d): px[x, y] = rgba(tones[2])
        return s

def shadow(s, x0, x1, y):
    for x in range(int(x0), int(x1)):
        if x % 2 == 0: s.P(x, y, 'O')

# ---------- 잎 ----------
PROFILE = {
    'lance': lambda t: math.sin(math.pi * t) ** 0.9,
    'oval': lambda t: math.sin(math.pi * t) ** 0.55,
    'heart': lambda t: (math.sin(math.pi * min(1, t * 1.15)) ** 0.5) * (1 if t > .08 else .4),
    'paddle': lambda t: min(1, math.sin(math.pi * t) ** 0.35 * 1.05),
    'needle': lambda t: (1 - t) * .9 + .1,
    'round': lambda t: math.sqrt(max(0, 1 - (2 * t - 1) ** 2)),
    'arrow': lambda t: (1.25 - t) * math.sin(math.pi * min(1, t * 1.6)) ** .4,
}
def leaf(s, x, y, ang, ln, wd, tones=T_GREEN, shape='lance', bend=0.0, vein=True, holes=0, split=0, mid=None):
    """잎 한 장(자기 외곽선 포함)을 s 위에 얹는다. bend=끝으로 갈수록 휘는 정도(+면 아래로)."""
    L = s.layer(); f = PROFILE[shape]; n = max(6, int(ln))
    spine = []
    for i in range(n + 1):
        t = i / n; a = ang + bend * t * t
        if not spine: spine.append((x, y, a))
        else:
            px_, py_, _ = spine[-1]; spine.append((px_ + math.cos(a) * ln / n, py_ + math.sin(a) * ln / n, a))
    left = [(px_ - math.sin(a) * wd * f(i / n), py_ + math.cos(a) * wd * f(i / n)) for i, (px_, py_, a) in enumerate(spine)]
    right = [(px_ + math.sin(a) * wd * f(i / n), py_ - math.cos(a) * wd * f(i / n)) for i, (px_, py_, a) in enumerate(spine)]
    L.poly(left + right[::-1], tones[1])
    # 그늘: 잎맥 기준 아래쪽(빛 반대) 절반
    lower = left if math.cos(ang) >= 0 else right
    L.poly([(p[0], p[1]) for p in spine] + lower[::-1], tones[1])
    sh = s.layer(); sh.poly([(p[0], p[1]) for p in spine] + lower[::-1], tones[0])
    L.im.alpha_composite(sh.im)
    # 빛: 위쪽 가장자리 1px
    upper = right if math.cos(ang) >= 0 else left
    for i in range(1, len(upper) - 1): L.P(upper[i][0] + (1 if math.cos(ang) < 0 else 0), upper[i][1] + 1, tones[2]) if f(i / n) > .35 else None
    if vein:
        for i in range(1, int(n * .85)): L.P(spine[i][0], spine[i][1], mid or tones[0])
    for k in range(holes):   # 몬스테라 같은 갈라진 틈(투명)
        t = .3 + .5 * k / max(1, holes - 1) if holes > 1 else .5
        i = int(t * n); px_, py_, a = spine[i]
        for sd in (1, -1):
            for d in range(int(wd * .45), int(wd * f(t)) + 2):
                L.clear(px_ - math.sin(a) * d * sd, py_ + math.cos(a) * d * sd)
    for k in range(split):   # 바나나·극락조처럼 결 따라 찢어진 곳
        i = int(n * (.3 + .55 * k / max(1, split))); px_, py_, a = spine[i]
        sd = 1 if k % 2 else -1
        for d in range(2, int(wd * f(i / n)) + 2):
            L.clear(px_ - math.sin(a) * d * sd + math.cos(a) * d * .4, py_ + math.cos(a) * d * sd + math.sin(a) * d * .4)
    s.put(L)
    return spine[-1][:2]

def stem(s, pts, k='greenD', w=1, outline=False):
    L = s.layer() if outline else s
    for a, b in zip(pts, pts[1:]): L.line(a, b, k, w)
    if outline: s.put(L)

def blob(s, cx, cy, rx, ry, tones, bumps=7, seed=0, out=True):
    """수관·덤불 덩어리: 가장자리가 울퉁불퉁한 덩어리 + 3톤. 잡티 없이 큰 면으로."""
    r = random.Random(seed); L = s.layer()
    L.ell(cx - rx, cy - ry, cx + rx, cy + ry, tones[1])
    for i in range(bumps):
        a = i / bumps * 6.283 + r.random() * .4; br = min(rx, ry) * (.35 + r.random() * .2)
        bx, by = cx + math.cos(a) * rx * .85, cy + math.sin(a) * ry * .85
        L.ell(bx - br, by - br * .85, bx + br, by + br * .85, tones[1])
    L.shade(tones, d=max(2, round(min(rx, ry) * .3)))
    # 안쪽 잎 덩이 경계(어두운 짧은 호)로 입체감
    for i in range(max(2, bumps // 2)):
        a = r.random() * 6.283; d = r.random() * .5
        bx, by = cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d; br = min(rx, ry) * .3
        for t in range(0, 9):
            aa = .3 + t * .2
            X, Y = bx + math.cos(aa) * br, by + math.sin(aa) * br * .8
            if L.get(X, Y)[3]: L.P(X, Y, tones[0])
    s.put(L, out)

# ---------- 화분(방의 가구처럼 외곽선 + 테 + 옆면 그늘) ----------
POTS = dict(terra=('orange', 'redD', 'yellow'), white=('white', 'wallS', 'white'), navy=('navy', 'navyD', 'blue'),
            teal=('teal', 'greenD', 'skyL'), cream=('cream', 'wallD', 'white'), grey=('grey', 'greyD', 'white'),
            pink=('pink', 'redD', 'white'), yellow=('yellow', 'yellowD', 'cream'), wood=('woodL', 'wood', 'floorL'),
            black=('greyD', 'O', 'grey'), basket=('yellowD', 'wood', 'floorL'))
def pot(s, cx, yb, w, h, style='terra', shape='taper'):
    """바닥 기준 화분. 돌려주는 값 = 흙 높이(y)."""
    body, dark, lite = POTS[style]; L = s.layer(); x0 = cx - w / 2; x1 = cx + w / 2
    if shape == 'taper': pts = [(x0, yb - h), (x1, yb - h), (x1 - max(1, w * .12), yb), (x0 + max(1, w * .12), yb)]
    elif shape == 'bowl': pts = [(x0, yb - h)] + [(cx + math.cos(a) * w / 2, yb - h + math.sin(a) * h) for a in [i / 10 * math.pi for i in range(11)]][::-1] + [(x1, yb - h)]
    elif shape == 'round': pts = [(cx + math.cos(a) * w / 2, yb - h / 2 + math.sin(a) * h / 2) for a in [i / 16 * 6.283 for i in range(16)]]
    else: pts = [(x0, yb - h), (x1, yb - h), (x1, yb), (x0, yb)]
    L.poly(pts, body)
    a = L.im.split()[3].load()
    for yy in range(L.H):   # 가구처럼: 오른쪽 1/4 그늘 띠 + 왼쪽 1px 빛
        row = [xx for xx in range(L.W) if a[xx, yy]]
        if not row: continue
        r0, r1 = row[0], row[-1]; band = max(1, round((r1 - r0 + 1) * .25))
        for xx in range(r1 - band + 1, r1 + 1): L.Praw(xx, yy, dark)
        if r1 - r0 > 3: L.Praw(r0 + 1, yy, lite)
    if style == 'basket':
        for yy in range(int(yb - h) + 2, int(yb), 2):
            for xx in range(int(x0) + 1, int(x1)):
                if (xx + yy) % 4 == 0 and L.get(xx, yy)[3]: L.P(xx, yy, 'wood')
    if style == 'navy': L.R(x0 + 2, yb - h * .55, x1 - 2, yb - h * .55 + 1, 'white')
    s.put(L)
    if shape != 'round':
        R = s.layer(); R.R(x0 - 1, yb - h - 3, x1 + 1, yb - h, dark if style not in ('white', 'cream') else 'wallS'); R.R(x0, yb - h - 3, x1, yb - h - 2, lite); s.put(R)
    shadow(s, x0 - 2, x1 + 3, yb + 1)
    return yb - h - 3

def flower(s, x, y, k, kd, size=2):
    L = s.layer()
    if size <= 1: L.P(x, y, k)
    else:
        L.R(x - size // 2, y - size // 2, x + size - size // 2, y + size - size // 2, k); L.P(x + size // 2 - 1 + (size > 2), y + size // 2 - 1 + (size > 2), kd)
    s.put(L)

def vine(s, x, y, ln, seed, tones=T_GREEN, sway=2.0, gap=4, size=3):
    """늘어지는 덩굴: 가는 줄기 + 줄기 양쪽으로 외곽선 있는 작은 잎."""
    r = random.Random(seed); px_ = x
    for i in range(ln):
        px_ = x + math.sin(i / 9 + seed) * sway
        s.P(px_, y + i, tones[0])
        if i % gap == gap - 1:
            sd = 1 if (i // gap) % 2 else -1
            leaf(s, px_, y + i, math.pi / 2 - sd * 1.0, size + 1, size * .55, tones, 'oval', vein=False)
    return px_
