# 꾸미기 선택지: 물건마다 '실루엣이 다른' 모양 3가지(+ 일부는 색 3가지).
# rooms.py 가 VAR[아이템]에 고른 키('b1' = 모양 b, 색 1)를 넣고 그리면 그 모양으로 그려진다.
import math
from lib import K
import scenes

VAR = {}
SHAPES = {
    'rug':   [('a', '타원 러그'), ('b', '술 달린 사각 러그'), ('c', '꽃 러그')],
    'plant': [('a', '무성한 화분'), ('b', '선인장'), ('c', '산세베리아')],
    'chair': [('a', '1인 소파'), ('b', '높은 등받이 의자'), ('c', '빈백')],
    'lamp':  [('a', '갓 스탠드'), ('b', '아치형 스탠드'), ('c', '삼각대 스탠드')],
    'pendant': [('a', '촛대 샹들리에'), ('b', '크리스탈 샹들리에'), ('c', '링 샹들리에')],
}
COLORS = {
    'rug':   [('파랑', 'blue', 'navy'), ('빨강', 'red', 'redD'), ('초록', 'green', 'greenD')],
    'chair': [('청록', 'teal', 'green', 'greenD'), ('빨강', 'red', 'pink', 'redD'), ('노랑', 'yellow', 'cream', 'yellowD')],
    'lamp':  [('크림', 'cream', 'wallD'), ('빨강', 'red', 'redD'), ('초록', 'green', 'greenD')],
}
def keys(iid):
    """이 아이템의 선택지 키 목록. 첫 번째가 기본값"""
    sh = [k for k, _ in SHAPES[iid]]
    if iid not in COLORS: return sh
    return [f'{k}{c}' for k in sh for c in range(len(COLORS[iid]))]
def cur(iid):
    k = VAR.get(iid) or keys(iid)[0]
    return k[0], (int(k[1:]) if len(k) > 1 else 0)

def _shadow(s, x0, x1, y):
    for x in range(x0, x1):
        if (x + y) % 2 == 0: s.P(x, y, 'O')

# ---------- 러그 ----------
def rug(s, cx, cy, rx, ry):
    shp, ci = cur('rug'); _, c, cd = COLORS['rug'][ci]
    if shp == 'a':
        s.d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=K['O']); s.d.ellipse([cx-rx+1, cy-ry+1, cx+rx-1, cy+ry-1], fill=K[c])
        s.d.ellipse([cx-rx+7, cy-ry+3, cx+rx-7, cy+ry-3], fill=K[cd]); s.d.ellipse([cx-rx+11, cy-ry+5, cx+rx-11, cy+ry-5], fill=K[c])
        for x in range(cx-rx+10, cx+rx-10, 6): s.P(x, cy, 'cream'); s.P(x+3, cy, 'cream')
    elif shp == 'b':   # 원근 사다리꼴 + 테두리 + 마름모 무늬 + 앞뒤 술
        t, b = cy - ry + 2, cy + ry - 2; ins = max(4, rx // 8)
        s.poly([(cx-rx+ins, t), (cx+rx-ins, t), (cx+rx, b), (cx-rx, b)], c)
        s.poly([(cx-rx+ins+5, t+2), (cx+rx-ins-5, t+2), (cx+rx-6, b-2), (cx-rx+6, b-2)], cd, ol=False)
        s.poly([(cx-rx+ins+8, t+4), (cx+rx-ins-8, t+4), (cx+rx-10, b-4), (cx-rx+10, b-4)], c, ol=False)
        for x in range(cx - rx + 16, cx + rx - 16, 10):
            s.P(x, cy, 'cream'); s.P(x+1, cy-1, 'cream'); s.P(x+1, cy+1, 'cream'); s.P(x+2, cy, 'cream')
        for x in range(cx - rx + 1, cx + rx, 3): s.R(x, b + 1, x + 1, b + 3, 'cream')
        for x in range(cx - rx + ins + 1, cx + rx - ins, 3): s.R(x, t - 2, x + 1, t, 'cream')
    else:              # 꽃 러그: 꽃잎 테두리의 둥근 러그(폭이 좁고 가장자리가 물결)
        R = min(rx, ry * 3.2) * 0.62
        def ring(scale, col, ol):
            pts = []
            for i in range(64):
                a = i / 64 * 2 * math.pi
                r = scale * (1 + 0.13 * abs(math.sin(4 * a)))
                pts.append((round(cx + math.cos(a) * R * r), round(cy + math.sin(a) * ry * r)))
            s.poly(pts, col, ol=ol)
        ring(1.0, c, True); ring(0.72, 'cream', False); ring(0.58, cd, False); ring(0.3, 'yellow', False)

# ---------- 화분 ----------
def pot_plant(s, x, yb, big=False):
    s.__dict__.setdefault('poi', {}).setdefault('plant', set()).add((x + 7, yb))
    shp, _ = cur('plant')
    if shp == 'a':
        _shadow(s, x-3, x+(17 if big else 15), yb+1); scenes.plant(s, x, yb, big); return
    if shp == 'b':     # 선인장: 기둥 + 팔 두 개, 작은 토분
        _shadow(s, x-2, x+15, yb+1)
        pw, ph = 12, 9
        s.box(x, yb-ph, x+pw, yb, 'orange'); s.R(x-1, yb-ph-2, x+pw+1, yb-ph+1, 'redD'); s.R(x-1, yb-ph-3, x+pw+1, yb-ph-2, 'O')
        m = x + pw // 2; h = 34 if big else 24; top = yb - ph - 3 - h
        s.box(m-3, top, m+4, yb-ph-3, 'green'); s.R(m+2, top+2, m+3, yb-ph-3, 'greenD')
        ay = top + h // 2; s.box(m-9, ay-8, m-4, ay-1, 'green'); s.box(m-9, ay-2, m-2, ay+3, 'green')
        by = top + h // 3; s.box(m+4, by-6, m+9, by+1, 'green'); s.box(m+2, by, m+9, by+4, 'green')
        for yy in range(top + 3, yb - ph - 4, 4): s.P(m - 1, yy, 'yellow'); s.P(m + 1, yy + 2, 'yellow')
        s.R(m-1, top-2, m+2, top, 'pink'); s.P(m, top-3, 'pink')
        return
    # 산세베리아: 흰 원통 화분 + 뾰족한 잎 여러 장(키가 크다)
    _shadow(s, x-2, x+16, yb+1)
    pw, ph = 13, 11
    s.box(x, yb-ph, x+pw, yb, 'white'); s.R(x+1, yb-ph+1, x+pw-1, yb-ph+3, 'wallS'); s.R(x+pw-3, yb-ph+1, x+pw-1, yb-1, 'wallS')
    hs = [30, 38, 26, 34, 22] if big else [22, 28, 18, 25, 16]
    for i, h in enumerate(hs):
        bx = x + 1 + i * 2 + (i > 2); tip = (bx + 1 + (i - 2), yb - ph - h)
        s.poly([(bx, yb - ph), (bx + 3, yb - ph), tip], 'green' if i % 2 == 0 else 'greenD')
        s.line((bx, yb - ph - 1), tip, 'yellowD')

# ---------- 의자 ----------
def armchair(s, x, yb, col='teal', hi='green'):
    s.__dict__.setdefault('poi', {}).setdefault('sofa', set()).add((x + 18, yb))
    from rooms import box3d
    shp, ci = cur('chair'); _, c, h, d = COLORS['chair'][ci]
    if shp == 'a':     # 정면 1인 소파: 둥근 등받이 → 방석 → 양팔걸이 → 받침·다리
        _shadow(s, x-7, x+44, yb+1)
        def rbox(x0, y0, x1, y1, f, top=None, side=None, r=2):
            s.R(x0, y0 + r, x1, y1, 'O'); s.R(x0 + r, y0, x1 - r, y1, 'O'); s.R(x0 + 1, y0 + 1, x1 - 1, y1, 'O')
            s.R(x0 + 1, y0 + r + 1, x1 - 1, y1 - 1, f); s.R(x0 + r + 1, y0 + 1, x1 - r - 1, y1 - 1, f); s.R(x0 + 2, y0 + 2, x1 - 2, y1 - 1, f)
            if top: s.R(x0 + r + 1, y0 + 1, x1 - r - 1, y0 + 3, top); s.R(x0 + 2, y0 + 2, x1 - 2, y0 + 3, top)
            if side: s.R(x1 - 3, y0 + 3, x1 - 1, y1 - 1, side)
        rbox(x+1, yb-36, x+37, yb-12, c, h, d, 4)                 # 등받이
        s.R(x+6, yb-26, x+32, yb-25, d)                            # 등받이 바느질선
        rbox(x+3, yb-18, x+35, yb-7, h, None, None, 2)             # 방석
        s.R(x+4, yb-11, x+34, yb-8, c)
        rbox(x-6, yb-24, x+6, yb-4, c, h, d, 3)                    # 왼팔
        rbox(x+32, yb-24, x+44, yb-4, c, h, d, 3)                  # 오른팔
        s.R(x-6, yb-5, x+44, yb-2, 'O'); s.R(x-5, yb-5, x+43, yb-3, d)   # 받침
        for lx in (x-4, x+40): s.R(lx, yb-2, lx+2, yb+1, 'woodD')
        return
    if shp == 'b':     # 윙백: 높은 등받이 + 날개 + 나무 다리
        _shadow(s, x-4, x+40, yb+1)
        box3d(s, x+3, yb-50, 30, 32, 5, h, c, d)
        s.R(x+6, yb-46, x+30, yb-44, h)
        box3d(s, x-2, yb-42, 7, 18, 6, h, c, d); box3d(s, x+31, yb-42, 7, 18, 6, h, c, d)
        box3d(s, x-2, yb-20, 40, 10, 8, h, c, d)
        for lx in (x, x+33): s.R(lx, yb-10, lx+3, yb, 'woodD'); s.P(lx, yb-1, 'O')
        s.R(x+3, yb-12, x+33, yb-11, 'O'); return
    # 빈백: 낮고 둥근 덩어리 + 눌린 자리
    _shadow(s, x-6, x+42, yb+1)
    pts = []
    for i in range(40):
        a = i / 40 * 2 * math.pi
        rx, ry = 23, 15 + (3 if math.sin(a) < 0 else 0)
        pts.append((round(x + 18 + math.cos(a) * rx * (1 + 0.06 * math.sin(3 * a))), round(yb - 15 + math.sin(a) * ry)))
    s.poly(pts, c)
    s.d.ellipse([x+6, yb-26, x+28, yb-16], fill=K[d]); s.d.ellipse([x+8, yb-25, x+28, yb-18], fill=K[c])
    s.R(x+30, yb-28, x+34, yb-26, h); s.R(x+33, yb-26, x+37, yb-22, h); s.P(x+2, yb-12, h); s.R(x+4, yb-6, x+30, yb-5, d)

# ---------- 스탠드 조명 ----------
def floorlamp(s, x, ytop, yb):
    shp, ci = cur('lamp'); _, c, d = COLORS['lamp'][ci]
    if shp == 'a':
        s.R(x, ytop+12, x+2, yb, 'O'); s.R(x-4, yb, x+6, yb+3, 'O')
        s.poly([(x-8, ytop), (x+10, ytop), (x+6, ytop+12), (x-4, ytop+12)], c); s.R(x-6, ytop+1, x+8, ytop+2, d); return
    if shp == 'b':     # 아치: 무거운 받침 → 위로 → 왼쪽으로 휘어 둥근 갓이 매달림
        s.R(x-5, yb-2, x+8, yb+3, 'O'); s.R(x-4, yb-1, x+7, yb+1, 'greyD')
        top = ytop - 6
        s.R(x, top + 10, x+2, yb-1, 'O')
        cx, r = x - 12, 12      # 봉 꼭대기에서 왼쪽으로 반원을 그리며 넘어간다(끊김 없이 1도 간격)
        for t in range(0, 181):
            a = math.radians(t); px_, py_ = cx + r * math.cos(a), top + 10 - r * math.sin(a)
            s.R(round(px_), round(py_), round(px_) + 2, round(py_) + 2, 'O')
        hx = cx - r
        s.R(hx, top + 10, hx + 2, top + 16, 'O')
        s.d.chord([hx - 8, top + 14, hx + 10, top + 32], 180, 360, fill=K['O'])
        s.d.chord([hx - 7, top + 15, hx + 9, top + 31], 180, 360, fill=K[c])
        s.R(hx - 7, top + 22, hx + 10, top + 24, 'O'); s.R(hx - 1, top + 24, hx + 3, top + 26, 'cream'); return
    # 삼각대: 세 다리 + 원통 갓
    ap = (x + 1, ytop + 16)
    for fx_ in (x - 9, x + 11): s.line(ap, (fx_, yb + 2)); s.line((ap[0] + 1, ap[1]), (fx_ + 1, yb + 2), 'woodD')
    s.line(ap, (x + 1, yb + 3), 'woodD')
    s.R(x, ytop + 12, x + 3, ytop + 17, 'O')
    s.box(x - 8, ytop - 2, x + 11, ytop + 13, c); s.R(x - 7, ytop + 10, x + 10, ytop + 12, d); s.R(x - 7, ytop - 1, x + 10, ytop, 'white')

def defs(iid):
    """앱에 줄 선택지 목록: [{key, name}] — 이름은 '모양 · 색'"""
    out = []
    for k in keys(iid):
        nm = dict(SHAPES[iid])[k[0]]
        if iid in COLORS: nm += ' · ' + COLORS[iid][int(k[1:])][0]
        out.append(dict(key=k, name=nm))
    return out
# 아치형 스탠드는 갓이 왼쪽으로 25px 나가 있다 → 조명 중심도 옮긴다
LIGHT_SHIFT = {'lamp': {'a': (0, 0), 'b': (-24, 4), 'c': (0, 0)}}


# ---------- 샹들리에(300권 보상, 아이템 id는 예전 이름 pendant 그대로) ----------
def chandelier(s, cx, y0, y1, w):
    """천장(y0)에서 사슬로 y1까지 내려와 폭 w로 펼쳐진다. 방이 클수록 w가 크다"""
    shp, _ = cur('pendant')
    for y in range(y0, y1):                                           # 사슬(한 칸씩 엇갈림)
        s.P(cx + (y % 2), y, 'O'); s.P(cx + 1 - (y % 2), y, 'yellowD')
    s.R(cx - 3, y0, cx + 5, y0 + 2, 'yellowD'); s.R(cx - 3, y0, cx + 5, y0 + 1, 'O')     # 천장 받침
    h = max(10, w // 2)
    if shp == 'a':                                                    # 촛대형: 둥근 팔 + 촛불
        s.R(cx - 1, y1, cx + 3, y1 + h - 2, 'yellowD'); s.R(cx, y1, cx + 1, y1 + h - 2, 'yellow')
        s.d.ellipse([cx - 3, y1 + h - 6, cx + 5, y1 + h + 1], fill=K['yellowD'], outline=K['O'])
        n = 5 if w < 40 else 7
        ay = y1 + h // 2 + 2
        s.d.arc([cx - w // 2, ay - h // 2, cx + w // 2 + 1, ay + h // 3], 10, 170, fill=K['O'], width=2)
        s.d.arc([cx - w // 2 + 1, ay - h // 2, cx + w // 2, ay + h // 3 - 1], 10, 170, fill=K['yellow'], width=1)
        for i in range(n):
            a = math.pi * (0.06 + 0.88 * i / (n - 1))
            x = round(cx + 0.5 + math.cos(a) * w / 2 * 0.98); y = round(ay - h / 12 + math.sin(a) * h / 3 * 0.95)
            s.R(x - 2, y - 1, x + 3, y + 1, 'yellowD'); s.R(x - 2, y - 2, x + 3, y - 1, 'O')       # 받침 접시
            ch = 4 if w < 40 else 6
            s.R(x - 1, y - 2 - ch, x + 2, y - 2, 'white'); s.R(x + 1, y - 2 - ch, x + 2, y - 2, 'wallS')   # 초
            s.P(x, y - 3 - ch, 'yellow'); s.P(x, y - 4 - ch, 'orange'); s.P(x, y - 5 - ch, 'yellow')     # 불꽃
        s.P(cx, y1 + h + 2, 'yellowD'); s.P(cx + 1, y1 + h + 2, 'yellowD'); s.P(cx, y1 + h + 3, 'yellow')
        return
    if shp == 'b':                                                    # 크리스탈: 겹겹이 매달린 유리구슬
        s.R(cx - w // 4, y1, cx + w // 4 + 2, y1 + 2, 'yellowD'); s.R(cx - w // 4, y1, cx + w // 4 + 2, y1 + 1, 'O')
        tiers = 3 if w < 40 else 4
        s.R(cx, y1, cx + 2, y1 + h + 4, 'yellowD')                    # 가운데 놋쇠 기둥
        for k in range(tiers):
            ty = y1 + 3 + k * (h // tiers + 1)
            hw = round(w / 2 * (1 - 0.18 * k))
            for x in range(cx - hw + 1, cx + hw + 1, 3):               # 유리구슬 줄(2칸 폭, 진한 테두리)
                ln = 3 + ((x * 7 + k) % 3)
                s.R(x - 1, ty + 1, x + 2, ty + 2 + ln, 'seaD')
                s.R(x, ty + 1, x + 1, ty + 1 + ln, 'skyL'); s.P(x, ty + ln, 'white'); s.P(x + 1, ty + 1, 'sky')
            s.R(cx - hw - 1, ty - 1, cx + hw + 3, ty + 2, 'O'); s.R(cx - hw, ty, cx + hw + 2, ty + 1, 'yellow')   # 놋쇠 고리
        by = y1 + 3 + tiers * (h // tiers + 1)
        s.R(cx - 1, by, cx + 3, by + 6, 'seaD'); s.R(cx, by, cx + 2, by + 5, 'skyL'); s.P(cx, by + 4, 'white'); s.P(cx + 1, by + 1, 'sky')
        for (dx, dy) in ((-w // 3, 4), (w // 3, 6), (0, h // 2)): s.P(cx + dx, y1 + dy, 'white')   # 반짝
        return
    # 링: 놋쇠 고리 + 전구
    ry = max(3, w // 7); rcy = y1 + h // 2
    for dx in (-w // 2 + 2, 0, w // 2 - 1):                          # 매다는 줄 3가닥
        s.line((cx, y1), (cx + dx, rcy - ry + 1), 'greyD')
    s.d.ellipse([cx - w // 2, rcy - ry, cx + w // 2 + 1, rcy + ry], outline=K['O'], width=3)
    s.d.ellipse([cx - w // 2 + 1, rcy - ry + 1, cx + w // 2, rcy + ry - 1], outline=K['yellow'], width=1)
    n = 6 if w < 40 else 9
    for i in range(n):
        a = math.pi * (0.1 + 0.8 * i / (n - 1))
        x = round(cx + math.cos(a) * w / 2); y = round(rcy + math.sin(a) * ry)
        s.R(x, y, x + 1, y + 3, 'O')
        s.R(x - 1, y + 3, x + 2, y + 6, 'cream'); s.P(x, y + 4, 'white'); s.R(x - 1, y + 6, x + 2, y + 7, 'yellowD')
