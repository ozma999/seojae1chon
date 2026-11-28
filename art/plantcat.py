# 식물 카탈로그 v2: 방 그림 도트 규칙(px.py)으로 다시 그림. 72종 + 상징목 3종(별도 파일)
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plantpx import *

PI2 = math.pi / 2
def base(W, H):
    s = Spr(int(W), int(H), int(W * .25) + 4, int(H * .5) + 4); s.lw = int(W)   # lw = 그림 폭(여백 뺀 값)
    return s, int(W) // 2

# ================= 큰 바닥 화분 (씨앗 4) =================
def monstera(H=80):
    s, cx = base(H * 1.35, H); t = pot(s, cx, H - 2, H * .28, H * .2, 'white')
    for ang, ln, tn in [(-2.85, .4, T_DARK), (-0.3, .4, T_DARK), (-2.4, .46, T_DEEP), (-0.75, .46, T_DEEP), (-1.95, .52, T_GREEN), (-1.2, .52, T_GREEN), (-1.6, .44, T_GREEN)]:
        e = (cx + math.cos(ang) * H * ln * .5, t + math.sin(ang) * H * ln * .5); stem(s, [(cx, t), e])
        leaf(s, e[0], e[1], ang + .2, H * ln * .7, H * .14, tn, 'heart', bend=.6, holes=3)
    return s
def fiddle(H=120):
    s, cx = base(H * .62, H); t = pot(s, cx, H - 2, H * .24, H * .16, 'basket')
    stem(s, [(cx, t), (cx - 1, H * .5), (cx, H * .1)], 'woodD', 2)
    y = t - 6; i = 0
    while y > H * .12:
        sd = 1 if i % 2 else -1; leaf(s, cx, y, -PI2 + sd * (1.05 - (t - y) / H * .5), H * .19, H * .085, (T_DEEP, T_GREEN)[i % 2], 'oval', bend=sd * .3); y -= H * .07; i += 1
    leaf(s, cx, H * .14, -PI2, H * .15, H * .07, T_GREEN, 'oval')
    return s
def kentia(H=130):
    s, cx = base(H * 1.1, H); t = pot(s, cx, H - 2, H * .2, H * .15, 'navy')
    for dx in (-3, 0, 3): stem(s, [(cx + dx, t), (cx + dx * 3, H * .38)], 'woodD', 2)
    for a in [-2.75, -2.35, -1.95, -1.6, -1.25, -0.85, -0.45]:
        x0, y0 = cx, H * .38; ln = H * .5
        pts = [(x0 + math.cos(a) * ln * u, y0 + math.sin(a) * ln * u + (u * u) * ln * .6) for u in [i / 24 for i in range(25)]]
        stem(s, pts, 'greenD')
        for i in range(3, 24, 2):
            x, y = pts[i]; l = H * .08 * math.sin(math.pi * i / 24) + 2
            for sd in (1, -1): leaf(s, x, y, PI2 + sd * .35 + (a + PI2) * .3, l, 1.6, T_GREEN if sd > 0 else T_DEEP, 'needle', vein=False)
    return s
def areca(H=110):   # 아레카 야자: 여러 줄기가 위로 솟아 끝이 살짝 휘는 깃털 잎
    s, cx = base(H * .95, H); t = pot(s, cx, H - 2, H * .3, H * .2, 'cream', 'box')
    for k, (a, ln) in enumerate([(-2.15, .62), (-1.9, .74), (-1.68, .82), (-1.45, .78), (-1.2, .66), (-1.0, .5), (-2.4, .48)]):
        L_ = H * ln; x0 = cx + (k - 3) * 2
        pts = [(x0 + math.cos(a) * L_ * u, t + math.sin(a) * L_ * u + (u ** 2.4) * L_ * .35) for u in [i / 22 for i in range(23)]]
        stem(s, pts, 'yellowD')
        for i in range(5, 22, 3):
            x, y = pts[i]; l = H * .08 * math.sin(math.pi * (i - 3) / 20) + 2
            for sd in (1, -1): leaf(s, x, y, a + sd * 1.15 + .45, l, 1.1, T_LIME if sd > 0 else T_GREEN, 'needle', vein=False)
    return s
def banana(H=150):
    s, cx = base(H * .95, H); t = pot(s, cx, H - 2, H * .2, H * .14, 'basket')
    top = H * .34; L = s.layer(); L.R(cx - 4, top, cx + 4, t, 'green'); L.R(cx + 1, top, cx + 4, t, 'greenD'); L.R(cx - 3, top, cx - 2, t, 'leafL'); s.put(L)
    for a, b in [(-2.75, -.9), (-2.25, -.7), (-1.85, -.4), (-1.3, .4), (-0.85, .7), (-0.4, .9), (-1.57, 0)]:
        leaf(s, cx, top, a, H * .42, H * .085, T_GREEN if a > -2 and a < -1 else T_DEEP, 'paddle', bend=(-1.5 if a < -1.57 else 1.5) * abs(b) + (0 if b else .3), split=3)
    return s
def bird(H=120):
    s, cx = base(H * .8, H); t = pot(s, cx, H - 2, H * .24, H * .17, 'white')
    for a, ln in [(-2.25, .5), (-1.95, .66), (-1.7, .78), (-1.45, .72), (-1.15, .6), (-0.88, .48)]:
        e = (cx + math.cos(a) * H * ln * .5, t + math.sin(a) * H * ln * .5); stem(s, [(cx, t), e], 'greenD')
        leaf(s, e[0], e[1], a, H * ln * .5, H * .065, T_SAGE if ln > .6 else T_DEEP, 'oval', split=2)
    L = s.layer(); L.poly([(cx + 6, H * .3), (cx + 18, H * .25), (cx + 13, H * .32)], 'orange'); L.poly([(cx + 8, H * .3), (cx + 13, H * .2), (cx + 12, H * .3)], 'blue'); s.put(L)
    return s
def alocasia(H=110):   # 알로카시아: 긴 잎자루 끝에 아래로 처진 화살촉 잎(흰 잎맥)
    s, cx = base(H * .95, H); t = pot(s, cx, H - 2, H * .26, H * .2, 'cream', 'bowl')
    for a, ln, tn in [(-2.6, .5, T_DARK), (-0.55, .5, T_DARK), (-2.1, .72, T_DEEP), (-1.05, .74, T_DEEP), (-1.6, .64, T_DEEP)]:
        e = (cx + math.cos(a) * H * ln * .7, t + math.sin(a) * H * ln * .7); stem(s, [(cx, t), e], 'green', 2)
        side = -1 if a < -PI2 else 1; lw, ll = H * .12, H * .3
        tip = (e[0] + side * ll * .55, e[1] + ll * .75)              # 잎끝은 바깥 아래로
        lob1 = (e[0] - side * lw * .9, e[1] - lw * .55); lob2 = (e[0] + side * lw * .2, e[1] - lw * .9)   # 위쪽 두 귓불
        L = s.layer()
        pts = [lob1, lob2, (e[0] + side * lw * 1.0, e[1] + lw * .2), tip, (e[0] - side * lw * .55, e[1] + lw * .9), (e[0] - side * lw * .8, e[1] + lw * .1)]
        L.poly(pts, tn[1]); L.poly([e, tip, (e[0] - side * lw * .55, e[1] + lw * .9), (e[0] - side * lw * .8, e[1] + lw * .1), lob1], tn[0])
        L.line(e, tip, 'sage'); L.line(e, lob1, 'sage'); L.line(e, lob2, 'sage')
        for u in (.35, .65):
            mx, my = e[0] + (tip[0] - e[0]) * u, e[1] + (tip[1] - e[1]) * u
            L.line((mx, my), (mx + side * lw * .7, my - lw * .2), 'sage'); L.line((mx, my), (mx - side * lw * .5, my + lw * .1), 'sage')
        s.put(L)
    return s
def olive(H=110):
    s, cx = base(H * .75, H); t = pot(s, cx, H - 2, H * .22, H * .17, 'grey', 'box')
    stem(s, [(cx, t), (cx - 3, H * .55), (cx - 10, H * .3)], 'woodD', 3); stem(s, [(cx - 3, H * .55), (cx + 8, H * .28)], 'woodD', 2)
    for x, y, rx in [(cx - 12, H * .26, H * .17), (cx + 9, H * .22, H * .17), (cx - 1, H * .12, H * .15), (cx + 15, H * .38, H * .1), (cx - 17, H * .4, H * .1)]:
        blob(s, x, y, rx, rx * .7, T_SAGE, 6, int(x))
    for x, y in [(cx - 8, H * .3), (cx + 12, H * .25), (cx, H * .15)]: s.P(x, y, 'navyD')
    return s
def lemon(H=110):
    s, cx = base(H * .78, H); t = pot(s, cx, H - 2, H * .26, H * .18, 'terra')
    stem(s, [(cx, t), (cx, H * .45)], 'woodD', 3)
    blob(s, cx, H * .3, H * .32, H * .24, T_GREEN, 9, 3)
    for x, y in [(-14, -6), (8, -14), (16, 6), (-4, 10), (-18, 8), (2, -2)]: flower(s, cx + x * H / 110, H * .3 + y * H / 110, 'yellow', 'yellowD', 4)
    return s
def traveler(H=150):   # 여인초: 부채꼴로 펼쳐진 큰 잎
    s, cx = base(H * 1.0, H); t = pot(s, cx, H - 2, H * .22, H * .14, 'white', 'box')
    L = s.layer(); L.poly([(cx - 6, t), (cx + 6, t), (cx + 3, H * .45), (cx - 3, H * .45)], 'greenD'); L.R(cx - 2, H * .45, cx + 1, t, 'green'); s.put(L)
    for k in range(9):
        a = -math.pi + .25 + k * (math.pi - .5) / 8
        leaf(s, cx, H * .45, a, H * .5, H * .06, T_GREEN if k % 2 else T_DEEP, 'paddle', split=2)
    return s
def pachira(H=110):   # 파키라: 땋은 줄기 + 손바닥 잎
    s, cx = base(H * .8, H); t = pot(s, cx, H - 2, H * .24, H * .17, 'yellow', 'box')
    for k in range(3): stem(s, [(cx - 3 + k * 3 + math.sin(y / 6 + k * 2) * 2, y) for y in range(int(t), int(H * .42), -2)], 'wood', 2)
    for hx, hy in [(cx - 16, H * .3), (cx + 14, H * .28), (cx, H * .18), (cx - 6, H * .4), (cx + 20, H * .44), (cx - 22, H * .46)]:
        stem(s, [(cx, H * .42), (hx, hy)], 'greenD')
        for j in range(5): leaf(s, hx, hy, -PI2 + (j - 2) * .6, H * .13, H * .04, (T_GREEN, T_DEEP)[j % 2], 'lance', bend=.2)
    return s
def dracaena(H=120):   # 드라세나 마지나타: 가는 줄기 끝에 뾰족 잎 폭죽
    s, cx = base(H * .8, H); t = pot(s, cx, H - 2, H * .22, H * .2, 'black', 'box')
    for (ex, ey) in [(cx - 18, H * .3), (cx + 4, H * .12), (cx + 20, H * .36)]:
        stem(s, [(cx, t), ((cx + ex) / 2 + 4, (t + ey) / 2), (ex, ey)], 'wood', 2)
        for j in range(11): a = -math.pi + j * math.pi / 10; leaf(s, ex, ey, a, H * .13, 1.6, (T_GREEN, ('greenD', 'green', 'red'))[j % 2], 'needle', bend=.5 * (1 if a > -PI2 else -1), vein=False)
    return s
def rubber(H=110):    # 고무나무: 짙은 광택 타원 잎
    s, cx = base(H * .7, H); t = pot(s, cx, H - 2, H * .24, H * .18, 'white', 'round')
    stem(s, [(cx, t), (cx + 2, H * .15)], 'woodD', 2)
    for i, y in enumerate(range(int(t - 6), int(H * .12), -int(H * .08))):
        sd = 1 if i % 2 else -1; leaf(s, cx, y, -PI2 + sd * 1.15, H * .2, H * .075, T_DARK, 'oval', mid='red')
    leaf(s, cx + 2, H * .16, -PI2, H * .1, H * .03, ('redD', 'red', 'pink'), 'lance')
    return s
def treefern(H=130):  # 나무고사리: 털 많은 줄기 위로 고사리 우산
    s, cx = base(H * 1.1, H); t = pot(s, cx, H - 2, H * .22, H * .14, 'grey', 'box')
    L = s.layer(); L.R(cx - 4, H * .35, cx + 5, t, 'woodD'); [L.P(cx - 4 + (y % 3) * 3, y, 'wood') for y in range(int(H * .35), int(t))]; s.put(L)
    for a in [-2.9, -2.5, -2.1, -1.75, -1.4, -1.05, -0.65, -0.25]:
        ln = H * .45; pts = [(cx + math.cos(a) * ln * u, H * .35 + math.sin(a) * ln * u + u * u * ln * .5) for u in [i / 22 for i in range(23)]]
        stem(s, pts, 'moss')
        for i in range(2, 22, 2):
            x, y = pts[i]; l = H * .06 * math.sin(math.pi * i / 22) + 1.5
            for sd in (1, -1): leaf(s, x, y, a + sd * 1.3, l, 1.5, T_GREEN if sd > 0 else T_DEEP, 'lance', vein=False)
    return s
def bamboo(H=140):
    s, cx = base(H * .55, H); t = pot(s, cx, H - 2, H * .4, H * .15, 'wood', 'box')
    for k, (dx, h) in enumerate([(-10, .92), (-3, 1.0), (4, .86), (10, .78)]):
        L = s.layer(); x = cx + dx; top = H * (1 - h) + 2
        L.R(x - 2, top, x + 2, t, 'leafL'); L.R(x + 1, top, x + 2, t, 'green')
        for y in range(int(t) - 12, int(top), -14): L.R(x - 2, y, x + 3, y + 1, 'greenD')
        s.put(L)
        for y in range(int(top) + 6, int(t) - 20, 18):
            for sd in (1, -1): leaf(s, x, y, -PI2 + sd * 1.2, H * .12, H * .022, T_GREEN, 'lance', bend=sd * .5)
    return s
def papyrus(H=110):   # 파피루스 수반: 물 화분 + 폭죽 같은 잎 머리
    s, cx = base(H * .9, H); t = pot(s, cx, H - 2, H * .42, H * .14, 'navy', 'bowl')
    L = s.layer(); L.R(cx - H * .18, t, cx + H * .18, t + 2, 'sea'); L.R(cx - H * .12, t, cx - H * .06, t + 1, 'skyL'); s.put(L, False)
    for k, (ex, ey) in enumerate([(cx - 22, H * .3), (cx - 8, H * .14), (cx + 6, H * .1), (cx + 20, H * .24), (cx + 30, H * .42), (cx - 30, H * .45)]):
        stem(s, [(cx + (k - 2.5) * 2, t), (ex, ey)], 'green')
        for j in range(9): a = -math.pi + .2 + j * (math.pi - .4) / 8; leaf(s, ex, ey, a, H * .08, 1.2, T_LIME, 'needle', bend=.6 if a > -PI2 else -.6, vein=False)
    return s
def kelp_tank(H=130):  # 켈프 수조(오셔너리움): 동그란 유리 수조 + 켈프 + 물고기
    s, cx = base(H * .55, H); w = H * .42
    L = s.layer(); L.R(cx - w / 2, H * .06, cx + w / 2, H - 14, 'sea'); L.R(cx - w / 2 + 2, H * .06, cx - w / 2 + 6, H - 14, 'sky'); L.R(cx + w / 2 - 6, H * .06, cx + w / 2, H - 14, 'seaD')
    for k in range(3): L.poly([(cx - w / 2 + 8 + k * 9, H * .06), (cx - w / 2 + 12 + k * 9, H * .06), (cx - w / 2 + 2 + k * 9, H - 14), (cx - w / 2 - 2 + k * 9, H - 14)], 'skyL') if k < 2 else None
    s.put(L)
    for k, x in enumerate([cx - w * .3, cx - w * .05, cx + w * .25]):
        pts = [(x + math.sin(y / 7 + k) * 2.5, y) for y in range(int(H - 18), int(H * .14 + k * 8), -2)]
        stem(s, pts, 'yellowD')
        for i in range(2, len(pts), 5): leaf(s, pts[i][0], pts[i][1], -PI2 + (1 if (i // 5) % 2 else -1) * .8, H * .09, H * .025, ('greenD', 'yellowD', 'yellow'), 'lance', vein=False)
    for (fx, fy, k) in [(cx - 8, H * .3, 'orange'), (cx + 9, H * .5, 'yellow'), (cx - 4, H * .65, 'white')]:
        F = s.layer(); F.R(fx, fy, fx + 5, fy + 3, k); F.poly([(fx + 5, fy + 1), (fx + 8, fy - 1), (fx + 8, fy + 4)], k); F.P(fx + 1, fy + 1, 'O'); s.put(F)
    B = s.layer(); B.R(cx - w / 2 - 2, H - 16, cx + w / 2 + 2, H - 2, 'greyD'); B.R(cx - w / 2 - 2, H - 16, cx + w / 2 + 2, H - 14, 'grey')
    B.R(cx - w / 2 - 2, H * .04, cx + w / 2 + 2, H * .07, 'grey'); s.put(B)
    for x, k in [(cx - 10, 'pink'), (cx + 2, 'red'), (cx + 10, 'orange')]: flower(s, x, H - 19, k, 'redD', 4)
    shadow(s, cx - w / 2 - 3, cx + w / 2 + 4, H - 1)
    return s
def agave(H=80):
    s, cx = base(H * 1.3, H); t = pot(s, cx, H - 2, H * .4, H * .25, 'terra', 'bowl')
    for k, a in enumerate([-3.0, -0.15, -2.6, -0.55, -2.2, -0.95, -1.85, -1.3, -1.57]):
        leaf(s, cx, t + 2, a, H * (.42 + .1 * (k > 5)), H * .07, ('greenD', 'sage', 'skyL'), 'needle', bend=.3 if a > -PI2 else -.3, mid='yellowD')
    return s

# ================= 중간 화분 (씨앗 2) =================
def hydrangea(H=50):
    s, cx = base(H * 1.0, H); t = pot(s, cx, H - 2, H * .4, H * .26, 'white')
    for a in [-2.8, -2.2, -0.9, -0.3]: leaf(s, cx, t, a, H * .25, H * .1, T_GREEN, 'oval')
    for x, y, k, kd in [(-9, -.42, 'blue', 'navy'), (8, -.48, 'purple', 'navyD'), (-1, -.62, 'sky', 'blue'), (12, -.3, 'pink', 'redD'), (-12, -.25, 'sky', 'blue')]:
        L = s.layer(); r = H * .15; L.ell(cx + x - r, t + y * H - r, cx + x + r, t + y * H + r, k); L.shade((kd, k, 'white')); s.put(L)
    return s
def cactus_col(H=70):
    s, cx = base(H * .7, H); t = pot(s, cx, H - 2, H * .45, H * .18, 'terra')
    for x, h, w in [(-9, .45, 7), (0, .78, 9), (9, .35, 7)]:
        L = s.layer(); L.R(cx + x - w / 2, t - H * h, cx + x + w / 2, t, 'green'); L.ell(cx + x - w / 2, t - H * h - w / 2, cx + x + w / 2, t - H * h + w / 2, 'green')
        L.shade(T_GREEN); [L.P(cx + x, y, 'cream') for y in range(int(t - H * h), int(t), 4)]; s.put(L)
    flower(s, cx, t - H * .78 - 5, 'pink', 'red', 3)
    return s
def snake(H=60):
    s, cx = base(H * .6, H); t = pot(s, cx, H - 2, H * .34, H * .22, 'grey', 'box')
    for dx, h, a in [(-6, .62, -1.78), (-2, .78, -1.62), (2, .7, -1.5), (6, .56, -1.38), (-1, .5, -1.95)]:
        leaf(s, cx + dx, t + 1, a, H * h, H * .065, T_SAGE if h > .6 else T_DEEP, 'needle', vein=False, mid='yellow')
    return s
def fern_stand(H=60):
    s, cx = base(H * 1.1, H); L = s.layer()
    for x in (cx - 9, cx + 8): L.R(x, H * .55, x + 2, H - 1, 'wood')
    L.R(cx - 12, H * .5, cx + 12, H * .55, 'woodL'); L.R(cx - 10, H * .8, cx + 10, H * .83, 'wood'); s.put(L)
    t = pot(s, cx, H * .5, H * .3, H * .14, 'teal')
    for a in [-3.0, -2.6, -2.2, -1.85, -1.55, -1.25, -0.9, -0.55, -0.15]:
        ln = H * .5; pts = [(cx + math.cos(a) * ln * u, t + math.sin(a) * ln * u * .7 + u * u * ln * .7) for u in [i / 14 for i in range(15)]]
        stem(s, pts, 'greenD')
        for i in range(1, 14, 2):
            for sd in (1, -1): leaf(s, *pts[i], a + sd * 1.4, 3, 1.2, T_GREEN, 'lance', vein=False)
    return s
def calathea(H=55):
    s, cx = base(H * 1.0, H); t = pot(s, cx, H - 2, H * .36, H * .25, 'pink', 'bowl')
    for a in [-2.6, -2.1, -1.6, -1.1, -0.55]:
        e = leaf(s, cx, t, a, H * .45, H * .12, ('purple', 'greenD', 'sage'), 'oval', mid='pink')
    return s
def peace_lily(H=55):
    s, cx = base(H * .9, H); t = pot(s, cx, H - 2, H * .34, H * .24, 'white', 'box')
    for a in [-2.7, -2.2, -1.0, -0.45, -1.7]: leaf(s, cx, t, a, H * .42, H * .1, T_DARK, 'lance', bend=.4 if a > -PI2 else -.4)
    for x, y in [(-6, .55), (5, .62)]:
        stem(s, [(cx, t), (cx + x, t - H * y)], 'green'); leaf(s, cx + x, t - H * y, -PI2, H * .16, H * .05, ('wallS', 'white', 'white'), 'oval', vein=False)
    return s
def aglaonema(H=50):
    s, cx = base(H * 1.0, H); t = pot(s, cx, H - 2, H * .36, H * .24, 'cream')
    for k, a in enumerate([-2.7, -2.2, -1.8, -1.35, -0.9, -0.45]): leaf(s, cx, t, a, H * .42, H * .1, (('redD', 'pink', 'white'), T_GREEN)[k % 2], 'lance', bend=.3, mid='pink')
    return s
def selloum(H=60):
    s, cx = base(H * 1.3, H); t = pot(s, cx, H - 2, H * .3, H * .22, 'grey', 'bowl')
    for a in [-2.8, -2.25, -1.65, -1.05, -0.4]:
        e = (cx + math.cos(a) * H * .25, t + math.sin(a) * H * .25); stem(s, [(cx, t), e], 'greenD')
        leaf(s, e[0], e[1], a, H * .38, H * .16, T_DEEP, 'heart', bend=.5, split=5)
    return s
def zz(H=55):
    s, cx = base(H * .8, H); t = pot(s, cx, H - 2, H * .34, H * .24, 'black', 'box')
    for dx, h, a in [(-6, .8, -1.85), (0, .95, -1.6), (6, .75, -1.3)]:
        pts = [(cx + dx * u * 2 + math.cos(a) * H * h * u * .2, t - H * h * u * .9) for u in [i / 10 for i in range(11)]]
        stem(s, pts, 'greenD')
        for i in range(2, 11, 2):
            for sd in (1, -1): leaf(s, *pts[i], -PI2 + sd * 1.0, H * .1, H * .04, T_DARK, 'oval', vein=False)
    return s
def anthurium(H=50):
    s, cx = base(H * .9, H); t = pot(s, cx, H - 2, H * .34, H * .24, 'white', 'round')
    for a in [-2.6, -2.0, -1.2, -0.5]: leaf(s, cx, t, a, H * .4, H * .13, T_DARK, 'heart', bend=.3)
    for x, y in [(-6, .6), (7, .55)]:
        stem(s, [(cx, t), (cx + x, t - H * y)], 'green'); leaf(s, cx + x, t - H * y, -PI2 + x * .05, H * .14, H * .07, ('redD', 'red', 'pink'), 'heart', vein=False)
        s.line((cx + x, t - H * y), (cx + x + 2, t - H * y - 6), 'yellow', 1)
    return s
def coffee(H=70):
    s, cx = base(H * .75, H); t = pot(s, cx, H - 2, H * .3, H * .2, 'wood', 'box')
    stem(s, [(cx, t), (cx, H * .12)], 'wood', 2)
    for i, y in enumerate(range(int(t - 6), int(H * .12), -6)):
        for sd in (1, -1): leaf(s, cx, y, -PI2 + sd * 1.25, H * .2, H * .05, T_DARK, 'lance', bend=sd * .2)
        if i % 2: flower(s, cx + 3, y + 2, 'red', 'redD', 2)
    return s
def eucalyptus(H=70):
    s, cx = base(H * .8, H); t = pot(s, cx, H - 2, H * .3, H * .22, 'cream', 'box')
    for ex, ey in [(cx - 12, H * .15), (cx + 2, H * .05), (cx + 14, H * .2)]:
        pts = [(cx + (ex - cx) * u, t + (ey - t) * u) for u in [i / 12 for i in range(13)]]; stem(s, pts, 'wood')
        for i in range(1, 13, 2):
            for sd in (1, -1): leaf(s, pts[i][0] + sd * 3, pts[i][1], 0, 4, 2.6, T_SAGE, 'round', vein=False)
    return s
def coral_cactus(H=50):   # 산호 선인장(오셔너리움 산호 정원)
    s, cx = base(H * 1.0, H); t = pot(s, cx, H - 2, H * .4, H * .2, 'teal', 'bowl')
    r = random.Random(4)
    def br(x, y, a, ln, d):
        e = (x + math.cos(a) * ln, y + math.sin(a) * ln); L = s.layer(); L.line((x, y), e, 'pink', 3); s.put(L)
        if d: [br(*e, a + da, ln * .75, d - 1) for da in (-.5, .45)]
        else: flower(s, *e, 'orange', 'redD', 3)
    for a in (-2.2, -1.6, -1.0): br(cx, t, a, H * .2, 2)
    return s
def roses(H=50):
    s, cx = base(H * .8, H); t = pot(s, cx, H - 2, H * .36, H * .26, 'terra', 'box')
    for x, y in [(-8, .4), (0, .55), (8, .45), (-3, .3), (5, .28)]:
        stem(s, [(cx, t), (cx + x, t - H * y)], 'greenD'); leaf(s, cx + x * .6, t - H * y * .5, -PI2 + x * .1, 5, 2, T_DEEP, 'oval', vein=False)
        L = s.layer(); L.ell(cx + x - 3, t - H * y - 3, cx + x + 3, t - H * y + 3, 'red'); L.shade(('redD', 'red', 'pink')); L.P(cx + x, t - H * y, 'redD'); s.put(L)
    return s
def lavender(H=50):
    s, cx = base(H * .9, H); t = pot(s, cx, H - 2, H * .4, H * .22, 'grey', 'box')
    for k in range(9):
        x = cx + (k - 4) * 2.4; top = t - H * (.4 + (k % 3) * .08); stem(s, [(cx + (k - 4), t), (x, top)], 'sage')
        for y in range(int(top), int(top + H * .14), 2): flower(s, x, y, 'purple', 'navyD', 2)
    return s
def sunflower(H=70):
    s, cx = base(H * .7, H); t = pot(s, cx, H - 2, H * .3, H * .2, 'yellow', 'box')
    for x, y, r in [(-6, .75, 6), (6, .6, 5)]:
        stem(s, [(cx, t), (cx + x, t - H * y)], 'greenD', 2); leaf(s, cx + x * .5, t - H * y * .5, -PI2 + x * .15, 8, 3, T_GREEN, 'heart')
        L = s.layer()
        for j in range(10): a = j / 10 * 6.283; L.ell(cx + x + math.cos(a) * r - 2, t - H * y + math.sin(a) * r - 2, cx + x + math.cos(a) * r + 2, t - H * y + math.sin(a) * r + 2, 'yellow')
        L.ell(cx + x - r * .55, t - H * y - r * .55, cx + x + r * .55, t - H * y + r * .55, 'woodD'); s.put(L)
    return s

# ================= 작은 화분 (씨앗 1) =================
def succulent(H=18, potk='white', tones=T_SAGE):
    s, cx = base(22, H); t = pot(s, cx, H - 2, 11, 6, potk)
    for a, l in [(-3.0, 8), (-0.15, 8), (-2.4, 7), (-0.75, 7), (-1.9, 6), (-1.25, 6), (-1.57, 5)]: leaf(s, cx, t + 1, a, l, 2.6, tones, 'lance', vein=False)
    s.P(cx, t - 4, 'pink'); return s
def ball_cactus(H=18):
    s, cx = base(16, H); t = pot(s, cx, H - 2, 10, 6, 'terra')
    L = s.layer(); L.ell(cx - 5, t - 9, cx + 4, t + 1, 'green'); L.shade(T_GREEN); [L.P(x, y, 'cream') for x, y in [(cx - 3, t - 4), (cx, t - 7), (cx + 2, t - 3)]]; s.put(L)
    flower(s, cx - 1, t - 11, 'pink', 'red', 3); return s
def tulips(H=24):
    s, cx = base(18, H); t = pot(s, cx, H - 2, 11, 7, 'yellow')
    for x, h, k in [(-4, 11, 'red'), (0, 14, 'pink'), (4, 10, 'red')]:
        stem(s, [(cx, t), (cx + x, t - h)], 'greenD'); L = s.layer(); L.R(cx + x - 2, t - h - 4, cx + x + 2, t - h + 1, k); L.P(cx + x - 2, t - h - 5, k); L.P(cx + x + 1, t - h - 5, k); L.shade(('redD', k, 'white')); s.put(L)
    leaf(s, cx, t, -2.3, 8, 2, T_GREEN, 'lance'); leaf(s, cx, t, -0.8, 8, 2, T_GREEN, 'lance'); return s
def violet(H=16):
    s, cx = base(18, H); t = pot(s, cx, H - 2, 11, 6, 'pink')
    for a in (-3.0, -2.3, -0.8, -0.1): leaf(s, cx, t + 1, a, 6, 2.6, T_DEEP, 'oval', vein=False)
    for x, y in [(-3, -4), (0, -6), (3, -4), (-1, -3), (2, -2)]: flower(s, cx + x, t + y, 'purple', 'navyD', 2)
    return s
def terrarium(H=22):
    s, cx = base(20, H); L = s.layer(); L.ell(cx - 8, 5, cx + 8, H - 2, 'skyL'); L.R(cx - 7, H - 7, cx + 7, H - 3, 'wood'); L.R(cx - 3, 1, cx + 3, 6, 'woodL'); L.P(cx - 5, 9, 'white'); L.P(cx - 5, 10, 'white'); s.put(L)
    leaf(s, cx - 2, H - 7, -1.9, 7, 2, T_GREEN, 'lance'); leaf(s, cx + 1, H - 7, -1.2, 6, 2, T_DEEP, 'lance'); flower(s, cx + 4, H - 9, 'red', 'redD', 2)
    shadow(s, cx - 8, cx + 9, H - 1); return s
def basil(H=20):
    s, cx = base(18, H); t = pot(s, cx, H - 2, 11, 7, 'terra')
    for a, l in [(-2.8, 6), (-2.2, 7), (-1.6, 8), (-1.0, 7), (-0.4, 6)]: leaf(s, cx, t, a, l, 3, T_LIME, 'oval', vein=False)
    return s
def stucky(H=26):
    s, cx = base(14, H); t = pot(s, cx, H - 2, 10, 7, 'grey', 'box')
    for dx, h in [(-3, 12), (-1, 16), (1, 14), (3, 10)]: leaf(s, cx + dx, t + 1, -PI2, h, 1.4, T_DEEP, 'needle', vein=False)
    return s
def pothos_shelf(H=40):
    s, cx = base(24, H); t = pot(s, cx, 12, 12, 7, 'cream')
    for a in (-2.6, -1.9, -1.2, -0.5): leaf(s, cx, t + 1, a, 6, 3, T_GREEN, 'heart', vein=False)
    vine(s, cx - 5, t + 4, H - 16, 1, sway=1.5); vine(s, cx + 5, t + 4, H - 24, 2, sway=1.2); return s
def pilea(H=20):
    s, cx = base(22, H); t = pot(s, cx, H - 2, 11, 6, 'white', 'round')
    for a in [-2.8, -2.2, -1.6, -1.0, -0.4]:
        e = (cx + math.cos(a) * 7, t + math.sin(a) * 8); stem(s, [(cx, t), e], 'green'); leaf(s, e[0] - 2.5, e[1], 0, 5, 3, T_GREEN, 'round', vein=False)
    return s
def marimo(H=20):
    s, cx = base(16, H); L = s.layer(); L.R(cx - 5, 4, cx + 5, H - 2, 'skyL'); L.R(cx - 5, 9, cx + 5, H - 2, 'sky'); L.R(cx - 4, 1, cx + 4, 4, 'woodL'); s.put(L)
    B = s.layer(); B.ell(cx - 3, H - 9, cx + 3, H - 3, 'green'); B.shade(T_DEEP); s.put(B); shadow(s, cx - 5, cx + 6, H - 1); return s
def kokedama(H=26):
    s, cx = base(20, H); L = s.layer(); L.ell(cx - 6, H - 13, cx + 6, H - 2, 'moss'); L.shade(T_DARK); s.put(L)
    for a in [-2.6, -2.0, -1.4, -0.8]: leaf(s, cx, H - 12, a, 8, 3, T_GREEN, 'heart', vein=False)
    shadow(s, cx - 6, cx + 7, H - 1); return s
def shell_air(H=16):
    s, cx = base(22, H); L = s.layer(); L.poly([(cx - 9, H - 3), (cx + 9, H - 3), (cx + 6, H - 8), (cx - 6, H - 8)], 'cream'); L.shade(('wallD', 'cream', 'white'))
    for x in range(int(cx - 6), int(cx + 7), 3): L.line((x, H - 8), (cx, H - 3), 'wallD')
    s.put(L)
    for a in [-2.8, -2.2, -1.6, -1.0, -0.4]: leaf(s, cx, H - 8, a, 7, 1.2, T_SAGE, 'needle', vein=False, bend=.4)
    shadow(s, cx - 9, cx + 10, H - 2); return s
def haworthia(H=18):
    s, cx = base(16, H); t = pot(s, cx, H - 2, 10, 6, 'navy', 'box')
    for a in [-2.8, -2.3, -1.9, -1.57, -1.25, -0.85, -0.35]: leaf(s, cx, t + 1, a, 7, 1.6, ('moss', 'greenD', 'white'), 'needle', vein=False)
    return s
def rosemary(H=24):
    s, cx = base(18, H); t = pot(s, cx, H - 2, 11, 7, 'terra', 'box')
    for dx in (-4, -1, 2, 5):
        pts = [(cx + dx * u * 1.2, t - (H - 10) * u) for u in [i / 6 for i in range(7)]]; stem(s, pts, 'wood')
        for p in pts[1:]: s.P(p[0] - 1, p[1], 'sage'); s.P(p[0] + 1, p[1] - 1, 'greenD')
    return s
def daisy(H=22):
    s, cx = base(18, H); t = pot(s, cx, H - 2, 11, 7, 'teal', 'box')
    for x, h in [(-4, 9), (0, 12), (4, 8)]:
        stem(s, [(cx, t), (cx + x, t - h)], 'greenD'); L = s.layer(); L.ell(cx + x - 3, t - h - 3, cx + x + 3, t - h + 3, 'white'); L.P(cx + x, t - h, 'yellow'); L.P(cx + x + 1, t - h, 'yellow'); s.put(L)
    return s
def mini_tank(H=20):   # 미니 산호 수조
    s, cx = base(24, H); L = s.layer(); L.R(cx - 10, 3, cx + 10, H - 3, 'sea'); L.R(cx - 9, 4, cx - 6, H - 4, 'sky'); L.R(cx - 11, H - 4, cx + 11, H - 2, 'greyD'); s.put(L)
    for x, k in [(-5, 'pink'), (0, 'orange'), (5, 'red')]: flower(s, cx + x, H - 6, k, 'redD', 3)
    F = s.layer(); F.R(cx - 2, 7, cx + 2, 9, 'yellow'); F.P(cx + 2, 7, 'yellow'); F.P(cx + 2, 9, 'yellow'); s.put(F); shadow(s, cx - 11, cx + 12, H - 1); return s

# ================= 행잉 (씨앗 2) =================
def hang_base(W, H, potk='white', shape='bowl', rope='cream', y=32, pw=16, ph=9):
    """천장 고리 + 끈(외곽선 있는 끈이라 어느 벽에서도 보인다) + 화분. 돌려주는 t = 흙 높이"""
    s, cx = base(W, H)
    Rp = s.layer()
    for x in (cx - pw / 2 + 2, cx + pw / 2 - 2): Rp.line((cx, 2), (x, y - ph - 1), rope)
    Rp.R(cx - 1, 0, cx + 2, 3, 'woodD'); Rp.R(cx - 2, y - ph - 6, cx + 3, y - ph - 4, rope)   # 고리 + 매듭
    s.put(Rp)
    t = pot(s, cx, y, pw, ph, potk, shape)
    for yy in range(int(y + 1), int(y + 3)): [s.clear(x, yy) for x in range(-s.ox, s.W - s.ox)]   # 점선 그림자 지우기
    return s, cx, t
def hang_pothos(H=90):
    s, cx, t = hang_base(36, H)
    for k, (x, l) in enumerate([(-7, H - 30), (-2, H - 24), (4, H - 40), (8, H - 28)]): vine(s, cx + x, t + 4, l, k * 3, T_GREEN, 1.8)
    for a in (-2.6, -2.0, -1.2, -0.5): leaf(s, cx, t + 1, a, 7, 3.4, T_GREEN, 'heart', vein=False)
    return s
def hang_pearls(H=80):
    s, cx, t = hang_base(30, H, 'cream', 'bowl', 'woodD')
    for k, (x, l) in enumerate([(-6, H - 40), (-3, H - 28), (0, H - 46), (3, H - 32), (6, H - 38)]):
        for y in range(int(t + 4), int(t + 4 + l), 3):
            X = cx + x + math.sin(y / 7 + k) * 1.2; L = s.layer(); L.R(X - 1, y, X + 1, y + 2, 'green' if (y // 3) % 2 else 'leafL'); s.put(L)
    return s
def hang_fern(H=60):
    s, cx, t = hang_base(50, H, 'basket', 'box', 'woodD', 26, 22, 8)
    for a in [-3.1, -2.7, -2.3, -0.8, -0.4, 0.0, 0.4, 2.7, 1.2, 1.9]:
        ln = 20; pts = [(cx + math.cos(a) * ln * u, t + 4 + math.sin(a) * ln * u * .6 + u * u * 14) for u in [i / 12 for i in range(13)]]
        stem(s, pts, 'greenD')
        for i in range(1, 12, 2):
            for sd in (1, -1): leaf(s, *pts[i], a + sd * 1.4, 3, 1.1, T_GREEN, 'lance', vein=False)
    return s
def air_orb(H=46):
    s, cx = base(22, H); s.line((cx, 0), (cx, 20), 'greyD')
    L = s.layer(); L.ell(cx - 9, 20, cx + 9, H - 2, 'skyL'); L.P(cx - 5, 25, 'white'); L.P(cx - 5, 26, 'white'); s.put(L)
    for a in (-2.6, -2.0, -1.57, -1.1, -0.6): leaf(s, cx, H - 8, a, 7, 1.2, T_SAGE, 'needle', vein=False)
    flower(s, cx, H - 15, 'pink', 'redD', 2); return s
def hoya(H=70):
    s, cx, t = hang_base(36, H, 'terra', 'bowl', 'cream')
    for k, (x, l) in enumerate([(-6, H - 34), (0, H - 28), (6, H - 40)]): vine(s, cx + x, t + 4, l, k, T_DEEP, 1.5, 5, 4)
    for x, y in [(cx - 8, t + 14), (cx + 7, t + 22), (cx - 3, t + 30)]:
        L = s.layer()
        for j in range(5): a = j / 5 * 6.283; L.P(x + math.cos(a) * 2, y + math.sin(a) * 2, 'pink')
        L.P(x, y, 'red'); s.put(L)
    return s
def rhipsalis(H=80):
    s, cx, t = hang_base(36, H, 'white', 'round', 'woodD')
    for k in range(9):
        x = cx + (k - 4) * 2.2; l = H - 30 - (k % 3) * 8
        pts = [(x + math.sin(y / 10 + k) * (2 + k % 3), y) for y in range(int(t + 3), int(t + 3 + l), 2)]; stem(s, pts, 'green' if k % 2 else 'leafL')
    return s
def staghorn_ball(H=60):
    s, cx = base(50, H); s.line((cx, 0), (cx, 16), 'greyD')
    L = s.layer(); L.ell(cx - 9, 16, cx + 9, 34, 'moss'); L.shade(T_DARK); s.put(L)
    for a in [-2.8, -2.2, -0.9, -0.3, 2.3, 0.9, 1.6]: e = leaf(s, cx, 26, a, 16, 3.5, T_SAGE, 'paddle', split=1)
    return s
def jelly_hang(H=100):   # 해파리 행잉(오셔너리움 문 젤리): 반투명 종 + 촉수 같은 덩굴
    s, cx = base(44, H); s.line((cx, 0), (cx, 12), 'greyD')
    L = s.layer(); L.ell(cx - 16, 12, cx + 16, 40, 'skyL'); L.R(cx - 17, 26, cx + 17, 41, (0, 0, 0, 0)) if False else None
    s.put(L)
    C2 = s.layer(); C2.R(cx - 17, 27, cx + 17, 34, 'white'); s.im.alpha_composite(Image.new('RGBA', (1, 1)), (0, 0))
    # 종 아래를 잘라 반원으로
    for y in range(28, 42):
        for x in range(-s.ox, s.W - s.ox): s.clear(x, y)
    Bm = s.layer(); Bm.R(cx - 16, 26, cx + 17, 29, 'white'); s.put(Bm)
    I = s.layer()
    for k, (x, y) in enumerate([(-8, 18), (0, 15), (8, 18)]): I.ell(cx + x - 3, y - 2, cx + x + 3, y + 3, 'pink')
    s.put(I, False)
    for k, (x, l) in enumerate([(-12, H - 44), (-6, H - 34), (0, H - 30), (6, H - 38), (12, H - 46)]): vine(s, cx + x, 30, l, k * 5, T_TEAL, 2.2, 5, 3)
    return s
def ivy_basket(H=64):
    s, cx, t = hang_base(40, H, 'basket', 'box', 'woodD', 30, 20, 9)
    for k, (x, l) in enumerate([(-9, H - 26), (-4, H - 34), (3, H - 22), (9, H - 30)]): vine(s, cx + x, t + 3, l, k * 2, T_DEEP, 1.2, 4, 3)
    for a in (-2.8, -2.2, -1.6, -1.0, -0.4): leaf(s, cx, t + 1, a, 6, 3, T_DEEP, 'heart', vein=False)
    return s
def spanish_moss(H=56):
    s, cx = base(46, H); L = s.layer(); L.R(4, 2, s.lw - 4, 6, 'woodD'); L.R(4, 2, s.lw - 4, 3, 'wood'); s.put(L)
    r = random.Random(3)
    for k in range(13):
        x = 6 + k * 2.8; l = r.randint(H // 3, H - 8)
        stem(s, [(x + math.sin(y / 5 + k) * 1.5, y) for y in range(6, 6 + l, 2)], ('sage', 'greyD', 'white')[k % 3])
    return s

# ================= 벽걸이 (씨앗 2) =================
def staghorn_board(H=40):
    s, cx = base(44, H); B = s.layer(); B.R(cx - 9, 6, cx + 9, H - 4, 'woodL'); B.R(cx + 6, 6, cx + 9, H - 4, 'wood'); s.put(B)
    L = s.layer(); L.ell(cx - 6, H / 2 - 5, cx + 6, H / 2 + 6, 'moss'); L.shade(T_DARK); s.put(L)
    for a in [-2.5, -2.0, -1.2, -0.7, 2.2, 1.0]: leaf(s, cx, H / 2, a, 16, 3.2, T_SAGE, 'paddle', split=1)
    s.R(cx - 1, 2, cx + 1, 6, 'greyD'); return s
def wall_shelf(H=36):
    s, cx = base(50, H); B = s.layer(); B.R(3, H - 12, s.lw - 3, H - 9, 'woodL'); B.R(3, H - 10, s.lw - 3, H - 9, 'wood'); B.R(8, H - 9, 10, H - 4, 'woodD'); B.R(s.lw - 10, H - 9, s.lw - 8, H - 4, 'woodD'); s.put(B)
    s.paste(succulent().trim(), 12, H - 11); s.paste(ball_cactus().trim(), 26, H - 11)
    p = pothos_shelf().trim(); s.im.alpha_composite(p, (36 + s.ox - p.width // 2, H - 12 - 10 + s.oy))
    return s
def moss_frame(H=30):
    s, cx = base(34, H); B = s.layer(); B.R(2, 2, s.lw - 2, H - 2, 'woodD'); B.R(4, 4, s.lw - 4, H - 4, 'moss'); s.put(B)
    for x, y, r, tn in [(10, 11, 6, T_GREEN), (22, 9, 5, T_DEEP), (16, 19, 6, T_SAGE), (26, 19, 4, T_GREEN)]: blob(s, x, y, r, r * .8, tn, 5, x)
    flower(s, 9, 20, 'yellow', 'yellowD', 2); flower(s, 25, 13, 'pink', 'redD', 2); return s
def ivy_wall(H=70, W=40, seed=2):
    s, cx = base(W, H); r = random.Random(seed)
    for v in range(3):
        x = 6 + v * (W - 12) / 2
        pts = []
        for y in range(H - 2, 4, -1):
            if y % 5 == 0: x += r.choice((-1, 1))
            pts.append((x, y))
        stem(s, pts, 'woodD')
        for i in range(3, len(pts), 5): sd = 1 if (i // 5) % 2 else -1; leaf(s, *pts[i], -PI2 + sd * 1.2, 5, 3, (T_GREEN, T_DEEP, T_LIME)[r.randint(0, 2)], 'heart', vein=False)
    return s
def green_panel(H=60):   # 수직 정원 패널
    s, cx = base(50, H); B = s.layer(); B.R(2, 2, s.lw - 2, H - 2, 'greyD'); B.R(4, 4, s.lw - 4, H - 4, 'moss'); s.put(B)
    r = random.Random(5)
    for y in range(10, H - 6, 11):
        for x in range(9, s.lw - 6, 11):
            kind = r.randint(0, 3)
            if kind == 0: blob(s, x, y, 6, 5, (T_GREEN, T_SAGE, T_DEEP)[r.randint(0, 2)], 5, x * y)
            elif kind == 1: [leaf(s, x, y + 3, a, 7, 2.5, T_GREEN, 'lance', vein=False) for a in (-2.4, -1.57, -0.7)]
            elif kind == 2: [leaf(s, x, y + 2, a, 6, 3, T_DEEP, 'heart', vein=False) for a in (-2.2, -0.9)]
            else: [flower(s, x + dx, y + dy, ('pink', 'yellow', 'white')[r.randint(0, 2)], 'redD', 2) for dx, dy in ((-2, 0), (2, -1), (0, 2))]
    return s
def wall_tank(H=40):   # 벽 어항
    s, cx = base(54, H); B = s.layer(); B.R(2, 2, s.lw - 2, H - 2, 'woodD'); B.R(4, 4, s.lw - 4, H - 4, 'sea'); B.R(5, 5, 9, H - 5, 'sky'); B.R(4, H - 9, s.lw - 4, H - 4, 'floorL'); s.put(B)
    for x, k in [(14, 'pink'), (24, 'orange'), (38, 'red'), (44, 'purple')]: flower(s, x, H - 10, k, 'redD', 4)
    for k, x in enumerate((19, 32, 47)):
        pts = [(x + math.sin(y / 4 + k) * 1.5, y) for y in range(H - 9, 10, -2)]; stem(s, pts, 'green')
    for fx, fy, k in [(18, 12, 'orange'), (34, 18, 'yellow')]: F = s.layer(); F.R(fx, fy, fx + 5, fy + 3, k); F.poly([(fx + 5, fy + 1), (fx + 8, fy - 1), (fx + 8, fy + 4)], k); s.put(F)
    return s
def ring_planter(H=40):
    s, cx = base(36, H); L = s.layer(); L.ell(cx - 14, 4, cx + 14, H - 4, 'yellowD'); L.ell(cx - 12, 6, cx + 12, H - 6, (0, 0, 0, 0)) if False else None; s.put(L)
    for y in range(0, H):
        for x in range(0, 36):
            if (x - cx) ** 2 / 144 + (y - H / 2) ** 2 / ((H / 2 - 6) ** 2) < 1: s.clear(x, y)
    t = pot(s, cx, H - 10, 14, 9, 'white', 'bowl')

    for a_ in (-2.6, -2.0, -1.2, -0.5): leaf(s, cx, t + 1, a_, 8, 3, T_GREEN, 'heart', vein=False)
    vine(s, cx + 5, t + 6, 18, 3, sway=1); return s
def seaweed_frame(H=36):   # 해초 액자(바닷속 정원 표본)
    s, cx = base(30, H); B = s.layer(); B.R(2, 2, s.lw - 2, H - 2, 'white'); B.R(4, 4, s.lw - 4, H - 4, 'skyL'); s.put(B)
    for k, x in enumerate((10, 15, 20)):
        pts = [(x + math.sin(y / 4 + k) * 1.5, y) for y in range(H - 6, 8, -2)]; stem(s, pts, ('green', 'teal', 'yellowD')[k])
        for i in range(0, len(pts), 3): leaf(s, *pts[i], -PI2 + (1 if i % 2 else -1) * .8, 4, 1.2, (T_GREEN, T_TEAL, ('greenD', 'yellowD', 'yellow'))[k], 'lance', vein=False)
    return s

# ================= 온실 소품 =================
def planter_bed(W=180, H=70, seed=7):   # 바닥 화단(6)
    s, cx = base(W, H); r = random.Random(seed); ry = 13; cy = H - ry - 3
    L = s.layer(); L.ell(4, cy - ry, W - 4, cy + ry, 'wallS'); L.ell(8, cy - ry + 2, W - 8, cy + ry - 3, 'woodD'); s.put(L)
    for k in range(int(W / 18)):
        x = 18 + k * (W - 36) / max(1, int(W / 18) - 1) + r.randint(-4, 4); kind = k % 4
        if kind == 0: [leaf(s, x, cy, a, r.randint(20, 30), 6, T_DEEP, 'heart', bend=.4, holes=2) for a in (-2.2, -1.0)]
        elif kind == 1: [leaf(s, x, cy, a, r.randint(14, 22), 2.5, T_GREEN, 'lance', bend=.3) for a in (-2.6, -2.0, -1.57, -1.1, -0.5)]
        elif kind == 2: blob(s, x, cy - 10, 12, 9, T_GREEN, 6, k)
        else: [leaf(s, x, cy, a, r.randint(18, 26), 4, T_SAGE, 'oval', split=1) for a in (-2.3, -1.6, -0.9)]
    for k in range(int(W / 25)): flower(s, 20 + r.random() * (W - 40), cy - r.randint(4, 20), ('red', 'yellow', 'white', 'pink')[k % 4], 'redD', 3)
    F = s.layer()
    for x in range(6, W - 6):
        dy = ry * math.sqrt(max(0, 1 - ((x - cx) / (W / 2 - 6)) ** 2))
        if dy > ry * .35: F.R(x, round(cy + dy) - 3, x + 1, round(cy + dy), 'wallS')
    s.put(F); shadow(s, 8, W - 8, cy + ry + 1); return s
def rail_planter(W=48):  # 난간 플랜터(3)
    s, cx = base(W, 26); r = random.Random(W)
    for k in range(7): x = 5 + k * (W - 10) / 6; leaf(s, x, 17, -PI2 + (r.random() - .5) * 1.2, r.randint(6, 11), 2, (T_GREEN, T_LIME)[k % 2], 'lance', vein=False)
    for k in range(5): flower(s, 6 + k * (W - 12) / 4 + r.randint(-1, 1), 17 - r.randint(6, 11), ('red', 'pink', 'yellow', 'white', 'purple')[k], 'redD', 3)
    B = s.layer(); B.R(1, 16, W - 1, 25, 'woodL'); B.R(1, 23, W - 1, 25, 'wood'); B.R(1, 16, W - 1, 17, 'floorL'); s.put(B)
    vine(s, 5, 24, 10, 3, sway=1); vine(s, W - 7, 24, 8, 4, sway=1); return s
def vine_curtain(W=96, H=60, seed=8):   # 덩굴 커튼(4)
    s, cx = base(W, H); r = random.Random(seed); B = s.layer(); B.R(0, 0, W, 4, 'green'); B.shade(T_GREEN); s.put(B)
    for x in range(4, W - 4, 8): vine(s, x + r.randint(-2, 2), 3, r.randint(H // 4, H - 4), seed + x, (T_GREEN, T_DEEP)[(x // 8) % 2], 1.3, 4, 3)
    return s
def plant_ladder(H=56):  # 계단 화분대(5)
    s, cx = base(56, H); B = s.layer()
    B.line((4, H - 1), (20, 2), 'woodD', 2); B.line((52, H - 1), (36, 2), 'woodD', 2)
    for y, x0, x1 in [(18, 15, 41), (36, 9, 47), (H - 4, 4, 52)]: B.R(x0, y, x1, y + 3, 'woodL')
    s.put(B)
    picks = [tulips, violet, ball_cactus, basil, succulent, daisy, haworthia, pilea, rosemary]; i = 0
    for y, xs in [(18, [22, 34]), (36, [16, 28, 40]), (H - 4, [10, 22, 34, 46])]:
        for x in xs:
            s.paste(picks[i % len(picks)]().trim(), x, y + 2); i += 1
    return s

CATALOG = [
 ('큰 바닥 화분 · 씨앗 4', [('몬스테라', monstera), ('떡갈고무나무', fiddle), ('켄차 야자', kentia), ('아레카 야자', areca), ('바나나 나무', banana), ('극락조', bird),
     ('알로카시아', alocasia), ('올리브 나무', olive), ('레몬나무', lemon), ('여인초', traveler), ('파키라', pachira), ('드라세나', dracaena),
     ('고무나무', rubber), ('나무고사리', treefern), ('대나무', bamboo), ('파피루스 수반', papyrus), ('켈프 수조', kelp_tank), ('아가베', agave)]),
 ('중간 화분 · 씨앗 2', [('수국', hydrangea), ('기둥 선인장', cactus_col), ('산세베리아', snake), ('고사리 화분대', fern_stand), ('칼라테아', calathea), ('스파티필름', peace_lily),
     ('아글라오네마', aglaonema), ('셀렘', selloum), ('금전수', zz), ('안스리움', anthurium), ('커피나무', coffee), ('유칼립투스', eucalyptus),
     ('산호 선인장', coral_cactus), ('장미', roses), ('라벤더', lavender), ('해바라기', sunflower)]),
 ('작은 화분 · 씨앗 1', [('다육이', succulent), ('꽃 선인장', ball_cactus), ('튤립', tulips), ('바이올렛', violet), ('테라리움', terrarium), ('바질', basil),
     ('스투키', stucky), ('흘러내리는 스킨답서스', pothos_shelf), ('필레아', pilea), ('마리모 병', marimo), ('코케다마', kokedama), ('조개 에어플랜트', shell_air),
     ('하월시아', haworthia), ('로즈마리', rosemary), ('데이지', daisy), ('미니 산호 수조', mini_tank)]),
 ('행잉 · 씨앗 2', [('마크라메 스킨답서스', hang_pothos), ('구슬 덩굴', hang_pearls), ('행잉 고사리', hang_fern), ('틸란드시아 유리구슬', air_orb), ('호야', hoya),
     ('립살리스', rhipsalis), ('박쥐란 볼', staghorn_ball), ('해파리 행잉', jelly_hang), ('아이비 바구니', ivy_basket), ('수염 틸란드시아', spanish_moss)]),
 ('벽걸이 · 씨앗 2', [('박쥐란 판', staghorn_board), ('벽 선반 화분', wall_shelf), ('이끼 액자', moss_frame), ('벽 아이비', ivy_wall), ('수직 정원 패널', green_panel),
     ('벽 어항', wall_tank), ('링 행잉', ring_planter), ('해초 액자', seaweed_frame)]),
 ('온실 소품 · 1000권부터', [('바닥 화단 · 6', planter_bed), ('난간 플랜터 · 3', rail_planter), ('덩굴 커튼 · 4', vine_curtain), ('계단 화분대 · 5', plant_ladder)]),
]
