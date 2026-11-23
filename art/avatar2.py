# 캐릭터 턴어라운드 + 모션 (앞·뒤·옆, 서기·걷기·앉기·말하기)
#
# 구조(새 머리·옷을 늘리기 쉽게):
#   - 앞모습은 avatar9.make() 그대로(지금 서재의 캐릭터와 같은 그림)
#   - 뒷모습·옆모습은 이 파일의 HAIR_BACK / HAIR_SIDE (머리), avatar9.OUTDEF (옷 정의) 를 쓴다
#   - 걷기 다리·앉기·말하기는 모든 머리·옷에 공통으로 적용된다
# 새 머리 추가: avatar9.make 의 앞머리 분기 + HAIR_BACK[키] + HAIR_SIDE[키]
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


# ---- 모든 방향이 같은 머리 원(앞모습의 머리 윤곽과 같은 크기) ----
HEAD = [2, 0, 25, 22]
def head_mask():
    m = Image.new('L', (W, 23), 0); ImageDraw.Draw(m).ellipse(HEAD, fill=255)
    return m
_HM = head_mask()
def in_head(x, y): return 0 <= y < 23 and 0 <= x < W and _HM.getpixel((x, y)) > 0

# ======================================================================
# 뒷모습
# ======================================================================
def _hair_back_cap(p, HB, HD, HL):
    p.E(HEAD, HB)
    for x, y0 in ((8, 6), (13, 4), (18, 6)): p.R(x, y0, x + 1, y0 + 8, HD)     # 머리결(짧게 3줄)
    for x, y in [(8, 2), (9, 2), (10, 1), (11, 1), (12, 1), (7, 3)]: p.P(x, y, HL)
def _below(p, HB, HD, y1, inset=1):
    """머리 원 아래로 늘어지는 머리(둥근 끝). 원 폭을 넘지 않는다"""
    for y in range(16, y1):
        a, z = 3 + inset, 25 - inset
        if y >= y1 - 2: a += 1; z -= 1
        p.R(a, y, z, y + 1, HB)
    p.R(4 + inset, y1 - 1, 24 - inset, y1, HD)
def hb_m_basic(p, HB, HD, HL): _hair_back_cap(p, HB, HD, HL)
def hb_crop(p, HB, HD, HL):    _hair_back_cap(p, HB, HD, HL)
def hb_side(p, HB, HD, HL):    _hair_back_cap(p, HB, HD, HL)
def hb_f_bob(p, HB, HD, HL):   _below(p, HB, HD, 25, 0); _hair_back_cap(p, HB, HD, HL)
def hb_long(p, HB, HD, HL):
    _below(p, HB, HD, 33, 0); _hair_back_cap(p, HB, HD, HL)
    for x in (7, 20): p.R(x, 20, x + 1, 31, HD)
def hb_pony(p, HB, HD, HL):
    _hair_back_cap(p, HB, HD, HL)
    for y in range(9, 28):                                          # 꼬리(가운데로 늘어짐)
        w = 6 if y < 14 else 5 if y < 22 else 4 if y < 25 else 2
        x0 = 14 - w // 2; p.R(x0, y, x0 + w, y + 1, HB); p.P(x0, y, HD); p.P(x0 + w - 1, y, HD)
    p.R(14, 11, 15, 24, HL)
    p.R(11, 7, 17, 9, 'red'); p.P(11, 8, 'redD')
def hb_curly(p, HB, HD, HL):
    p.E(HEAD, HB)
    for cx, cy in [(5, 5), (9, 3), (14, 2), (19, 3), (23, 5), (4, 11), (24, 11), (6, 16), (22, 16), (10, 17), (14, 18), (18, 17), (9, 10), (14, 9), (19, 10)]:
        p.E([cx - 3, cy - 3, cx + 3, cy + 3], HB); p.P(cx - 1, cy + 2, HD); p.P(cx, cy + 2, HD); p.P(cx - 1, cy - 2, HL)
def hb_bun(p, HB, HD, HL):
    _hair_back_cap(p, HB, HD, HL)
    p.E([9, -5, 18, 3], HB); p.P(11, -3, HL); p.P(12, -4, HL); p.R(11, 2, 17, 3, 'red')
HAIR_BACK = dict(m_basic=hb_m_basic, f_bob=hb_f_bob, crop=hb_crop, side=hb_side, long=hb_long, pony=hb_pony, curly=hb_curly, bun=hb_bun)

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

def back(hair, outfit, breath=0, hc=HC):
    HB, HD, HL = hc; O = OUTDEF[outfit]; oy = breath + 1
    p = Pen()
    # 목·귀
    p.R(12, 18, 16, 22, 'skin'); p.R(12, 20, 16, 22, 'skinD')
    for y in (13, 14, 15): p.P(2, y, 'skin'); p.P(25, y, 'skin')
    _torso(p, O, oy, True)
    _legs_front(p, O, oy, outfit)
    HAIR_BACK[hair](p, HB, HD, HL)
    p.outline()
    return p.im

# ======================================================================
# 옆모습(오른쪽을 본다. 왼쪽은 좌우 뒤집기)
# ======================================================================
# 옆얼굴: 머리 원 안의 오른쪽 아래가 얼굴. 앞머리 아랫선(fringe)과 뒷머리 경계(nape_x)만 머리마다 다르다
def side_head(p, HB, HD, HL, fringe=9, nape_x=12, ear=True, curls=False):
    # 머리카락-얼굴 경계: 이마 쪽은 살짝 앞, 귀 높이에서 가장 뒤, 턱은 앞으로 둥글게 말려 들어간다
    def edge(y):
        if y < 12: return nape_x + 2
        if y < 18: return nape_x
        return nape_x + (y - 17) * 2
    p.E(HEAD, HB)
    for y in range(0, 23):
        for x in range(W):
            if in_head(x, y) and x >= edge(y) and y >= fringe - (1 if x % 4 == 0 and y < fringe + 1 else 0):
                p.P(x, y, 'skin')
    for y in range(fringe, 23):                                       # 뺨·턱 경계 그늘
        if in_head(edge(y), y): p.P(edge(y), y, 'skinD')
    if ear: p.R(nape_x - 1, 13, nape_x + 2, 16, 'skin'); p.P(nape_x, 14, 'skinD'); p.P(nape_x - 1, 13, HD)
    for x, y in [(8, 2), (9, 2), (10, 1), (11, 1), (12, 1), (7, 3)]: p.P(x, y, HL)
    for x in range(nape_x, 24):                                       # 앞머리 끝 그늘
        if in_head(x, fringe - 1): p.P(x, fringe - 1, HD)
    if curls:
        for cx, cy in [(5, 5), (9, 3), (14, 2), (19, 3), (5, 11), (6, 16), (9, 9), (15, 7)]:
            p.E([cx - 3, cy - 3, cx + 3, cy + 3], HB); p.P(cx - 1, cy + 2, HD); p.P(cx, cy + 2, HD); p.P(cx - 1, cy - 2, HL)
def hs_m_basic(p, HB, HD, HL, layer):
    if layer == 'front': side_head(p, HB, HD, HL, 9, 12)
def hs_crop(p, HB, HD, HL, layer):
    if layer == 'front': side_head(p, HB, HD, HL, 8, 11)
def hs_side(p, HB, HD, HL, layer):
    if layer == 'front': side_head(p, HB, HD, HL, 10, 12)
def hs_f_bob(p, HB, HD, HL, layer):
    if layer == 'back':
        for y in range(14, 25): p.R(3, y, 13 if y < 23 else 12, y + 1, HB)
        p.R(4, 24, 12, 25, HD)
    else: side_head(p, HB, HD, HL, 10, 13, ear=False); p.R(10, 12, 13, 22, HB); p.P(11, 21, HD)
def hs_long(p, HB, HD, HL, layer):
    if layer == 'back':
        for y in range(14, 33): p.R(3, y, 13, y + 1, HB)
        p.R(4, 32, 12, 33, HD); p.R(6, 18, 7, 31, HD)
    else: side_head(p, HB, HD, HL, 10, 13, ear=False); p.R(10, 12, 13, 22, HB)
def hs_pony(p, HB, HD, HL, layer):
    if layer == 'back':
        for y in range(7, 25):                                        # 뒤로 늘어진 꼬리
            x0 = 0 if y < 18 else 1; w = 4 if y < 20 else 3
            p.R(x0, y, x0 + w, y + 1, HB); p.P(x0, y, HD)
    else:
        side_head(p, HB, HD, HL, 9, 12); p.R(2, 6, 5, 9, 'red'); p.P(2, 8, 'redD')
def hs_curly(p, HB, HD, HL, layer):
    if layer == 'front': side_head(p, HB, HD, HL, 9, 12, ear=False, curls=True)
def hs_bun(p, HB, HD, HL, layer):
    if layer == 'front':
        side_head(p, HB, HD, HL, 9, 12); p.E([5, -5, 13, 3], HB); p.P(7, -3, HL); p.R(8, 1, 12, 2, 'red')
HAIR_SIDE = dict(m_basic=hs_m_basic, f_bob=hs_f_bob, crop=hs_crop, side=hs_side, long=hs_long, pony=hs_pony, curly=hs_curly, bun=hs_bun)

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

def side(hair, outfit, breath=0, frame=None, talk=False, hc=HC):
    HB, HD, HL = hc; O = OUTDEF[outfit]; T, TS = O['top']; BC, BS = O['bc']
    oy = breath + 1
    nf, ff, lift, bob, sw = SIDE_STRIDE[frame] if frame is not None else STAND
    p = Pen()
    HAIR_SIDE[hair](p, HB, HD, HL, 'back')
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
    HAIR_SIDE[hair](p, HB, HD, HL, 'front')
    p.R(19, 14, 21, 17, 'O'); p.P(20, 14, 'white')                    # 눈
    p.R(18, 18, 21, 19, 'pink')
    if talk: p.R(21, 19, 23, 21, 'redD'); p.P(21, 20, 'O')
    else: p.R(21, 20, 23, 21, 'redD')
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
