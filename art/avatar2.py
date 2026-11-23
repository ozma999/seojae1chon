# 캐릭터 턴어라운드 + 모션 (앞·뒤·옆, 서기·걷기·앉기·말하기)
#
# 구조(새 머리·옷을 늘리기 쉽게):
#   - 앞모습은 avatar9.make() 그대로(지금 서재의 캐릭터와 같은 그림)
#   - 뒷모습·옆모습의 머리 윤곽은 앞모습 그림에서 뽑아 쓴다(head_shape) → 세 방향 실루엣이 항상 같다
#     머리마다 다른 점(앞머리 높이·귀·꼬리)은 STYLE 표, 옷은 avatar9.OUTDEF
#   - 걷기 다리·앉기·말하기는 모든 머리·옷에 공통으로 적용된다
# 새 머리 추가: avatar9.make 의 앞머리 분기 + STYLE[키] 한 줄 (꼬리처럼 특별하면 back_head/side_tail 에 몇 줄)
# 새 옷 추가:   avatar9.OUTDEF[키] (+ 특별 꾸밈이면 make / _torso_back / _torso_side 에 한 줄)
import math
from PIL import Image, ImageDraw
from lib import PAL32 as K
import avatar9
from avatar9 import W, H, OFF, OUTDEF

HC = ('woodD', 'deep', 'wood')   # 머리색(밝음, 그림자, 하이라이트)

class Pen:
    def __init__(s):
        s.im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    def P(s, x, y, n):
        y += OFF
        if 0 <= x < W and 0 <= y < H: s.im.putpixel((x, y), K[n] + (255,))
    def G(s, x, y):
        y += OFF
        return s.im.getpixel((x, y)) if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)
    def R(s, x0, y0, x1, y1, n):
        for y in range(y0, y1):
            for x in range(x0, x1): s.P(x, y, n)
    def E(s, b, n):
        t = Image.new('L', (W, H), 0); ImageDraw.Draw(t).ellipse([b[0], b[1] + OFF, b[2], b[3] + OFF], fill=255)
        for y in range(H):
            for x in range(W):
                if t.getpixel((x, y)): s.P(x, y - OFF, n)
    def line(s, a, b, n, w=1):
        (x0, y0), (x1, y1) = a, b
        k = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(k + 1):
            x = round(x0 + (x1 - x0) * i / k); y = round(y0 + (y1 - y0) * i / k)
            s.R(x, y, x + w, y + 1, n)
    def outline(s):
        a = s.im.load(); m = [[a[x, y][3] > 0 for x in range(W)] for y in range(H)]
        for y in range(H):
            for x in range(W):
                if not m[y][x] and any(0 <= x + dx < W and 0 <= y + dy < H and m[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    a[x, y] = K['O'] + (255,)


# ---- 머리 윤곽은 앞모습에서 그대로 가져온다(앞·뒤·옆이 같은 실루엣) ----
# 앞모습 얼굴 영역(avatar9 rowsF와 같은 값)
FACE_ROWS = {4: (9, 19), 5: (7, 21), 6: (6, 22), 7: (5, 23), 20: (5, 23), 21: (6, 22), 22: (8, 20)}
for _y in range(8, 20): FACE_ROWS[_y] = (4, 24)
def in_face(x, y): return y in FACE_ROWS and FACE_ROWS[y][0] <= x < FACE_ROWS[y][1]
_MARK = ('purple', 'seaD', 'sky')     # 머리카락만 골라내려고 잠깐 쓰는 표시색
_cache = {}
def head_shape(hair):
    """(머리카락 칸, 머리끈 칸, 귀 칸) — 앞모습 그림에서 뽑는다"""
    if hair in _cache: return _cache[hair]
    im = avatar9.make(hair, 'basic', _MARK); px = im.load()
    marks = {K[c] + (255,) for c in _MARK}
    hairm, tie, ears = set(), set(), set()
    for y in range(-OFF, 40):
        for x in range(W):
            c = px[x, y + OFF]
            if c in marks: hairm.add((x, y))
            elif c == K['red'] + (255,) and y < 12: tie.add((x, y))
            elif c in (K['skin'] + (255,), K['skinD'] + (255,)) and 12 <= y <= 16 and (x <= 2 or x >= 25): ears.add((x, y))
    _cache[hair] = (hairm, tie, ears)
    return _cache[hair]
def head_mask(hair):
    hairm, tie, ears = head_shape(hair)
    face = {(x, y) for y, (a, z) in FACE_ROWS.items() for x in range(a, z)}
    return hairm | tie | face

# 머리마다 옆·뒤에서 다른 점: 앞머리 아랫선 높이, 귀가 보이는지, 꼬리
STYLE = dict(m_basic=dict(fringe=10, ear=True), crop=dict(fringe=9, ear=True), side=dict(fringe=11, ear=True),
             f_bob=dict(fringe=11, ear=False), long=dict(fringe=11, ear=False), pony=dict(fringe=10, ear=True, tail=True),
             curly=dict(fringe=10, ear=False, curls=True), bun=dict(fringe=11, ear=True))
CURLS = [(5, 5), (9, 2), (14, 1), (19, 2), (23, 5), (3, 10), (24, 10), (7, 8), (12, 7), (17, 7), (21, 8)]

def _torso(p, O, oy, back):
    """앞·뒤 공통 몸통(뒤는 깃·단추 같은 앞 꾸밈 없이)"""
    T, TS = O['top']; BC, BS = O['bc']
    p.R(12, 21, 16, 23 + oy, 'skinD')
    rows = {22: (10, 18), 23: (8, 20), 24: (7, 21), 25: (7, 21), 26: (7, 21)}
    for y, (a, z) in rows.items(): p.R(a, y + oy, z, y + 1 + oy, T)
    p.R(9, 27 + oy, 19, 32 + oy, T)
    if O['sleeve'] == 'long':
        p.R(7, 27 + oy, 9, 31 + oy, T); p.R(19, 27 + oy, 21, 31 + oy, T)
        p.R(7, 31 + oy, 9, 32 + oy, 'skin'); p.R(19, 31 + oy, 21, 32 + oy, 'skin')
    else:
        p.R(7, 27 + oy, 9, 32 + oy, 'skin'); p.R(19, 27 + oy, 21, 32 + oy, 'skin')
        p.P(7, 26 + oy, TS); p.P(20, 26 + oy, TS)
    p.R(7, 32 + oy, 9, 33 + oy, 'skinD'); p.R(19, 32 + oy, 21, 33 + oy, 'skinD')
    for y in range(24, 32): p.P(9, y + oy, TS)                       # 뒤에서 보면 그늘은 반대쪽
    p.R(9, 31 + oy, 19, 32 + oy, TS)
    if O.get('stripe'):
        for y in range(24, 32, 2): p.R(7 if y < 27 else 9, y + oy, 21 if y < 27 else 19, y + 1 + oy, O['stripe'])
    if O.get('hood') and back:
        p.E([8, 19 + oy, 20, 27 + oy], T); p.E([10, 20 + oy, 18, 25 + oy], TS)
    if O.get('vest'):
        V, VS = O['vest']; p.R(9, 24 + oy, 19, 32 + oy, V); p.R(9, 31 + oy, 19, 32 + oy, VS)
    if O.get('overall'):
        p.R(10, 27 + oy, 18, 32 + oy, BC)
        p.line((11, 23 + oy), (16, 27 + oy), BC, 2); p.line((16, 23 + oy), (11, 27 + oy), BC, 2)    # X자 멜빵
    if O.get('coat'):
        p.R(9, 30 + oy, 19, 31 + oy, 'woodD'); p.R(9, 32 + oy, 19, 36, T); p.R(9, 35, 19, 36, TS); p.R(13, 32 + oy, 15, 36, TS)

def _legs_front(p, O, oy, outfit):
    BC, BS = O['bc']
    if O['bottom'] == 'pants':
        y0 = 36 if O.get('coat') else 32 + oy
        p.R(9, y0, 19, 38, BC); p.R(13, max(35, y0), 15, 38, BS)
    elif O['bottom'] == 'shorts':
        p.R(9, 32 + oy, 19, 35, BC); p.R(13, 34, 15, 35, BS)
        p.R(10, 35, 13, 38, 'skin'); p.R(15, 35, 18, 38, 'skin')
    elif O['bottom'] == 'skirt':
        p.R(9, 32 + oy, 19, 34, BC); p.R(8, 34, 20, 36, BC); p.R(8, 35, 20, 36, BS)
        p.R(10, 36, 13, 38, 'skin'); p.R(15, 36, 18, 38, 'skin')
    p.R(10, 38, 13, 40, 'white'); p.R(15, 38, 18, 40, 'white')
    shoe = 'redD' if outfit == 'dress' else 'O'
    p.R(9, 40, 13, 42, shoe); p.R(15, 40, 19, 42, shoe)

def back_head(p, hair, HB, HD, HL):
    st = STYLE.get(hair, {}); hairm, tie, ears = head_shape(hair)
    for (x, y) in ears: p.P(x, y, 'skin')
    m = head_mask(hair) - tie
    if st.get('tail'):   # 앞모습 오른쪽에 보이던 꼬리는 빼고, 뒤에서는 가운데로 늘어진다
        m = {(x, y) for (x, y) in m if not (x >= 24 and y >= 8)}
    for (x, y) in m: p.P(x, y, HB)
    lowest = max(y for _, y in m)
    for x, y0 in ((8, 5), (13, 3), (18, 5)):                         # 머리결 3줄
        for y in range(y0, min(y0 + 9, lowest - 1)):
            if (x, y) in m: p.P(x, y, HD)
    for x in range(W):                                                # 머리끝 그늘
        if (x, lowest) in m: p.P(x, lowest, HD)
    for x, y in [(8, 2), (9, 1), (10, 1), (11, 0), (12, 0), (7, 3)]:
        if (x, y) in m: p.P(x, y, HL)
    if st.get('curls'):
        for cx, cy in CURLS + [(8, 14), (14, 15), (20, 14), (11, 19), (17, 19)]:
            p.E([cx - 2, cy - 2, cx + 2, cy + 2], HB); p.P(cx - 1, cy + 2, HD); p.P(cx, cy + 2, HD); p.P(cx - 1, cy - 1, HL)
    if st.get('tail'):
        for y in range(9, 28):
            w = 6 if y < 14 else 5 if y < 22 else 4 if y < 25 else 2
            x0 = 14 - w // 2; p.R(x0, y, x0 + w, y + 1, HB); p.P(x0, y, HD); p.P(x0 + w - 1, y, HD)
        p.R(14, 11, 15, 24, HL); p.R(11, 7, 17, 9, 'red'); p.P(11, 8, 'redD')
    else:
        for (x, y) in tie: p.P(x, y, 'red')

def back(hair, outfit, breath=0, hc=HC):
    HB, HD, HL = hc; O = OUTDEF[outfit]; oy = breath + 1
    p = Pen()
    p.R(12, 18, 16, 23, 'skin'); p.R(12, 21, 16, 23, 'skinD')         # 목덜미
    _torso(p, O, oy, True)
    _legs_front(p, O, oy, outfit)
    back_head(p, hair, HB, HD, HL)
    p.outline()
    return p.im

# ======================================================================
# 옆모습(오른쪽을 본다. 왼쪽은 좌우 뒤집기)
# ======================================================================
# 옆얼굴: 앞모습 머리 윤곽 안에서, 얼굴 쪽(오른쪽) 아래만 살색. 얼굴 앞쪽 옆머리는 뺀다
def side_edge(y, fringe):
    """머리카락-얼굴 경계 x: 관자놀이(앞머리 바로 아래)는 조금 앞, 귀 높이에서 가장 뒤, 턱은 앞으로"""
    if y < fringe + 2: return 14
    if y < 18: return 12
    return 12 + (y - 17)
def side_head(p, hair, HB, HD, HL):
    st = STYLE.get(hair, {}); fr = st.get('fringe', 10)
    hairm, tie, ears = head_shape(hair)
    m = head_mask(hair)
    m = {(x, y) for (x, y) in m if not (x >= 14 and y >= fr and not in_face(x, y)) and not (x >= 24 and y >= 5 and not in_face(x, y))}
    for (x, y) in m: p.P(x, y, HB)
    for (x, y) in m:
        if in_face(x, y) and y >= fr and x >= side_edge(y, fr): p.P(x, y, 'skin')
    for y in range(fr, 23):                                           # 뺨 경계 그늘
        e = side_edge(y, fr)
        if (e, y) in m and in_face(e, y): p.P(e, y, 'skinD')
    for x in range(14, 25):                                           # 앞머리 끝 그늘
        if (x, fr - 1) in m: p.P(x, fr - 1, HD)
    for x, y in [(8, 2), (9, 1), (10, 1), (11, 0), (12, 0), (7, 3)]:
        if (x, y) in m: p.P(x, y, HL)
    if st.get('ear'): p.R(11, 13, 14, 16, 'skin'); p.P(12, 14, 'skinD'); p.P(11, 13, HD)
    if st.get('curls'):
        for cx, cy in CURLS[:8] + [(6, 14), (9, 17)]:
            p.E([cx - 2, cy - 2, cx + 2, cy + 2], HB); p.P(cx - 1, cy + 2, HD); p.P(cx, cy + 2, HD); p.P(cx - 1, cy - 1, HL)
    if tie and not st.get('tail'):
        for (x, y) in tie: p.P(x, y, 'red')
def side_tail(p, hair, HB, HD, HL):
    if not STYLE.get(hair, {}).get('tail'): return
    for y in range(7, 25):
        x0 = 0 if y < 18 else 1; w = 4 if y < 20 else 3
        p.R(x0, y, x0 + w, y + 1, HB); p.P(x0, y, HD)
    p.R(2, 6, 5, 9, 'red'); p.P(2, 8, 'redD')

# 걷기 4프레임(옆). 짧은 다리라 발은 몸 아래에서만 움직인다(뻗지 않음).
# (가까운 다리 발 x, 먼 다리 발 x, 들린 다리: 'n'|'f'|None, 몸 들림 px, 팔 흔들기)
SIDE_STRIDE = [(16, 11, None, 0, 1), (13, 14, 'f', 1, 0), (11, 16, None, 0, -1), (14, 13, 'n', 1, 0)]
STAND = (14, 13, None, 0, 0)

def _bob(im, dy, cut):
    """허리(cut) 위를 dy px 올린다. 빈 줄은 허리 바로 위 줄로 메운다"""
    if not dy: return im
    top = im.crop((0, 0, W, cut)); row = im.crop((0, cut - 1, W, cut))
    out = im.copy(); out.paste((0, 0, 0, 0), (0, 0, W, cut))
    out.alpha_composite(top, (0, -dy))
    for k in range(dy): out.alpha_composite(row, (0, cut - 1 - k))
    return out

NOSE = [(24, 14), (24, 15), (24, 16), (25, 15), (25, 16)]   # 둥근 코: 얼굴 앞선에서 2px

def side(hair, outfit, breath=0, frame=None, talk=False, hc=HC):
    HB, HD, HL = hc; O = OUTDEF[outfit]; T, TS = O['top']; BC, BS = O['bc']
    oy = breath + 1
    nf, ff, lift, bob, sw = SIDE_STRIDE[frame] if frame is not None else STAND
    p = Pen()
    side_tail(p, hair, HB, HD, HL)
    shoe = 'redD' if outfit == 'dress' else 'O'
    def leg(foot, up, col, sock):
        legc = col if O['bottom'] == 'pants' else 'skin'
        p.line((13, 33), (foot, 38 - up), legc, 3)
        p.R(foot, 38 - up, foot + 3, 40 - up, sock)
        p.R(foot, 40 - up, foot + 4, 42 - up, shoe); p.P(foot + 3, 40 - up, 'O' if shoe == 'O' else 'redD')
    leg(ff, 1 if lift == 'f' else 0, BS, 'wallS')                     # 먼 다리(그늘색)
    # ---- 몸통 ----
    p.R(13, 21, 17, 23 + oy, 'skinD')
    for y in range(22, 32): p.R(10, y + oy, 19, y + 1 + oy, T)
    p.R(10, 22 + oy, 11, 32 + oy, TS)
    if O.get('stripe'):
        for y in range(24, 32, 2): p.R(10, y + oy, 19, y + 1 + oy, O['stripe'])
    if O.get('vest'):
        V, VS = O['vest']; p.R(10, 24 + oy, 19, 32 + oy, V); p.R(17, 24 + oy, 19, 27 + oy, 'white')
    if O.get('overall'):
        p.R(12, 27 + oy, 19, 32 + oy, BC); p.R(16, 23 + oy, 18, 27 + oy, BC)
    if O.get('hood'):
        p.E([7, 19 + oy, 14, 27 + oy], T); p.E([8, 20 + oy, 13, 25 + oy], TS)
    if O['bottom'] == 'pants' and not O.get('coat'): p.R(10, 32 + oy, 18, 34, BC)
    if O['bottom'] == 'shorts': p.R(10, 32 + oy, 18, 35, BC)
    if O.get('coat'): p.R(9, 30 + oy, 19, 31 + oy, 'woodD')
    leg(nf, 1 if lift == 'n' else 0, BC, 'white')                     # 가까운 다리
    if O['bottom'] == 'skirt': p.R(10, 32 + oy, 18, 34, BC); p.R(9, 34, 20, 36, BC); p.R(9, 35, 20, 36, BS)
    if O.get('coat'): p.R(9, 32 + oy, 19, 36, T); p.R(9, 35, 19, 36, TS)
    # ---- 팔(가까운 팔, 살짝 흔들기) ----
    sx, sy = 14, 23 + oy; hx, hy = 14 + sw, 31 + oy
    if O['sleeve'] == 'long':
        p.line((sx, sy), (hx, hy - 1), T, 3); p.line((sx + 2, sy + 1), (hx + 2, hy - 1), TS)
    else:
        p.R(sx, sy, sx + 3, sy + 3, T); p.line((sx, sy + 3), (hx, hy - 1), 'skin', 3)
    p.R(hx, hy - 1, hx + 3, hy + 1, 'skin'); p.P(hx + 2, hy, 'skinD')
    # ---- 머리(앞모습과 같은 원) + 얼굴 ----
    side_head(p, hair, HB, HD, HL)
    if STYLE.get(hair, {}).get('tail'): p.R(2, 6, 5, 9, 'red'); p.P(2, 8, 'redD')   # 머리끈은 머리 위에
    for (x, y) in NOSE: p.P(x, y, 'skin')                              # 코(얼굴 앞선에서 살짝 튀어나옴)
    p.P(NOSE[-1][0] - 1, NOSE[-1][1] + 1, 'skinD')
    p.R(18, 14, 20, 17, 'O'); p.P(19, 14, 'white')                    # 눈(앞모습과 같은 높이·크기)
    p.R(16, 18, 19, 19, 'pink')
    if talk: p.R(20, 19, 22, 21, 'redD'); p.P(20, 20, 'O')
    else: p.R(20, 20, 22, 21, 'redD')
    p.outline()
    return _bob(p.im, bob, 33 + OFF)

# ======================================================================
# 앞모습: 서기는 avatar9 그대로, 걷기·앉기·말하기는 거기서 만든다
# ======================================================================
def _shift_cols(im, x0, x1, y0, y1, dy):
    """열 x0..x1, 행 y0..y1 을 dy 만큼 올리거나(음수) 내린다(다리 들기)"""
    src = im.copy(); px = im.load(); sp = src.load()
    for x in range(x0, x1):
        for y in range(y0, y1): px[x, y] = (0, 0, 0, 0)
        for y in range(y0, y1):
            ny = y + dy
            if y0 <= ny < y1 or ny < y0: px[x, ny] = sp[x, y] if sp[x, y][3] else px[x, ny]
    return im

def front(hair, outfit, breath=0, frame=None, talk=False, sit=False, hc=HC):
    im = avatar9.make(hair, outfit, hc, breath, hood='s' if outfit == 'hoodie' else None)
    if frame in (1, 3):                                               # 한 발 들기(왼발/오른발)
        x0, x1 = (7, 14) if frame == 1 else (14, 21)
        _shift_cols(im, x0, x1, 37 + OFF, H, -1)
        im = _bob(im, 1, 33 + OFF)
    if talk:
        p = Pen(); p.im = im; p.R(13, 19, 15, 21, 'redD'); p.P(13, 20, 'O'); p.P(14, 20, 'O')
    if sit:                                                           # 앉기: 다리를 짧게(무릎이 앞으로) + 몸이 아래로
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        cut = 34 + OFF
        out.alpha_composite(im.crop((0, 0, W, cut)), (0, 4))
        knees = im.crop((0, cut, W, cut + 3)); out.alpha_composite(knees, (0, cut + 4))
        out.alpha_composite(im.crop((0, 38 + OFF, W, H)), (0, cut + 7))
        im = out
    return im

def back_walk(hair, outfit, frame, hc=HC):
    im = back(hair, outfit, 0 if frame in (1, 3) else frame // 2, hc)
    if frame in (1, 3):
        x0, x1 = (14, 21) if frame == 1 else (7, 14)
        _shift_cols(im, x0, x1, 37 + OFF, H, -1)
        im = _bob(im, 1, 33 + OFF)
    return im

# 한 조합의 프레임 목록(앱 시트 순서). 새 동작은 여기 끝에 덧붙인다
def frames(hair, outfit, hc=HC):
    F = []
    F += [('front_stand', b, front(hair, outfit, b, hc=hc)) for b in (0, 1)]
    F += [('front_walk', f, front(hair, outfit, f % 2 if f in (0, 2) else 0, frame=f, hc=hc)) for f in range(4)]
    F += [('back_stand', b, back(hair, outfit, b, hc)) for b in (0, 1)]
    F += [('back_walk', f, back_walk(hair, outfit, f, hc)) for f in range(4)]
    F += [('side_stand', b, side(hair, outfit, b, hc=hc)) for b in (0, 1)]
    F += [('side_walk', f, side(hair, outfit, 0, frame=f, hc=hc)) for f in range(4)]
    F += [('sit', b, front(hair, outfit, b, sit=True, hc=hc)) for b in (0, 1)]
    F += [('front_talk', 0, front(hair, outfit, 0, talk=True, hc=hc)), ('side_talk', 0, side(hair, outfit, 0, talk=True, hc=hc))]
    return F
