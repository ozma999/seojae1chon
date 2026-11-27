# 상징목 3종: 실루엣이 완전히 다르게 (돔 / 기둥 / 거꾸로 매달린 종)
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plantpx import *
from plantcat import base, PI2

def banyan(W=440, H=430, seed=3):
    """숲의 지붕: 굵은 줄기 + 판근 + 공기뿌리, 천장에 닿는 넓고 납작한 수관(돔)."""
    s, cx = base(W, H); r = random.Random(seed); yb = H - 2
    # 화단
    B = s.layer(); B.ell(cx - 90, yb - 18, cx + 90, yb + 4, 'wallS'); B.ell(cx - 84, yb - 15, cx + 84, yb, 'woodD'); s.put(B)
    # 줄기(판근으로 퍼지며 내려옴)
    T = s.layer()
    T.poly([(cx - 20, H * .38), (cx + 20, H * .38), (cx + 26, yb - 30), (cx + 52, yb - 6), (cx - 52, yb - 6), (cx - 26, yb - 30)], 'woodD')
    for dx in (-36, -14, 12, 34): T.poly([(cx + dx * .4, yb - 50), (cx + dx * 1.45, yb - 6), (cx + dx * 1.05, yb - 6)], 'deep')
    T.R(cx - 16, H * .38, cx - 9, yb - 30, 'wood'); T.R(cx + 8, H * .38, cx + 12, yb - 30, 'deep')
    s.put(T)
    # 큰 가지
    def limb(x, y, ex, ey, w):
        L = s.layer(); L.line((x, y), (ex, ey), 'woodD', w); L.line((x, y - 1), (ex, ey - 1), 'wood', max(1, w // 3)); s.put(L)
    tops = [(-170, H * .2), (-95, H * .14), (0, H * .1), (95, H * .14), (170, H * .2)]
    for dx, ey in tops: limb(cx + dx * .15, H * .4, cx + dx, ey + 30, 10 if abs(dx) < 120 else 7)
    # 공기뿌리(가지에서 늘어진 가는 뿌리)
    for dx in (-150, -120, -70, 60, 110, 160):
        x = cx + dx; y0 = H * .22 + 30 + abs(dx) * .05; y1 = yb - 10 - r.randint(0, 50)
        L = s.layer(); stem(L, [(x + math.sin(y / 30) * 2, y) for y in range(int(y0), int(y1), 3)], 'wood', 2); s.put(L)
    # 수관: 뒤(어두운) → 앞(밝은) 층층이 덩어리, 위는 평평하게 천장까지
    for row, (y, n, rx, tn) in enumerate([(H * .1, 7, 46, T_DARK), (H * .16, 8, 44, T_DEEP), (H * .23, 7, 40, T_GREEN), (H * .29, 5, 32, T_DEEP)]):
        span = W * (.92 - row * .12)
        for k in range(n):
            x = cx - span / 2 + span * (k + .5) / n + r.randint(-6, 6)
            blob(s, x, y + r.randint(-5, 5), rx, rx * .62, tn, 8, seed * 100 + row * 10 + k)
    T2 = s.layer(); T2.R(cx - W / 2, -s.oy, cx + W / 2, H * .04, (0, 0, 0, 0)); s.put(T2, False)
    for k in range(10): blob(s, cx + (k - 4.5) * 34 + r.randint(-4, 4), yb - 14 + r.randint(-3, 2), 14, 9, (T_GREEN, T_DEEP)[k % 2], 6, k)
    return s

def kelp_column(W=150, H=430, seed=4):
    """바다 기둥(오셔너리움 켈프 숲): 천장까지 닿는 원통 수조, 켈프·빛줄기·물고기 떼·산호."""
    s, cx = base(W, H); r = random.Random(seed); w = 108; x0, x1 = cx - w / 2, cx + w / 2; top, bot = 16, H - 30
    G = s.layer(); G.R(x0, top, x1, bot, 'sea')
    G.R(x0, top, x0 + 10, bot, 'sky'); G.R(x0 + 3, top, x0 + 5, bot, 'skyL'); G.R(x1 - 14, top, x1, bot, 'seaD')
    for k in range(4):   # 위에서 비스듬히 내려오는 빛줄기
        a = x0 + 18 + k * 20; G.poly([(a, top), (a + 6, top), (a - 22 + 6, bot), (a - 22, bot)], 'blue' if k % 2 else 'sky') if k < 3 else None
    s.put(G)
    for k in range(5):   # 켈프: 길게 일렁이는 띠 + 드문드문 넓은 잎
        x = x0 + 16 + k * 19; ln = r.randint(int(H * .6), int(H * .88))
        pts = [(x + math.sin(y / 26 + k * 1.7) * 7, y) for y in range(int(bot - 6), int(bot - ln), -3)]
        L = s.layer(); stem(L, pts, ('yellowD', 'greenD')[k % 2], 3); s.put(L)
        for i in range(5, len(pts), 13): leaf(s, *pts[i], -PI2 + (1 if (i // 13) % 2 else -1) * .55, 26, 5, (('greenD', 'yellowD', 'yellow'), T_DEEP)[k % 2], 'lance', bend=.25 * (1 if (i // 13) % 2 else -1), vein=False)
    for (fx, fy, k) in [(cx - 30, H * .25, 'orange'), (cx - 18, H * .27, 'orange'), (cx - 24, H * .3, 'orange'), (cx + 14, H * .45, 'yellow'), (cx + 24, H * .47, 'yellow'), (cx + 6, H * .62, 'white'), (cx - 26, H * .7, 'pink')]:
        F = s.layer(); F.R(fx, fy, fx + 6, fy + 3, k); F.poly([(fx + 6, fy + 1), (fx + 9, fy - 1), (fx + 9, fy + 4)], k); F.P(fx + 1, fy + 1, 'O'); s.put(F)
    M = s.layer(); M.poly([(cx - 4, H * .15), (cx + 18, H * .12), (cx + 34, H * .17), (cx + 18, H * .19)], 'navy'); M.poly([(cx + 14, H * .13), (cx + 22, H * .08), (cx + 24, H * .14)], 'navy'); M.R(cx + 4, H * .165, cx + 28, H * .175, 'skyL'); s.put(M)
    for k in range(14): s.P(cx + 30 + math.sin(k) * 3, bot - 20 - k * 22, 'white')
    for x, k in [(x0 + 12, 'pink'), (x0 + 26, 'orange'), (x0 + 44, 'red'), (x0 + 62, 'purple'), (x0 + 80, 'pink'), (x0 + 96, 'yellow')]:
        L = s.layer()
        for j in range(5): a = -PI2 + (j - 2) * .45; L.line((x, bot - 3), (x + math.cos(a) * 8, bot - 3 + math.sin(a) * 10), k, 2)
        s.put(L)
    R = s.layer()
    for y0, h in ((top - 10, 12), (bot - 2, 30), (H * .5 - 4, 6)):
        R.R(x0 - 6, y0, x1 + 6, y0 + h, 'greyD'); R.R(x0 - 6, y0, x1 + 6, y0 + 2, 'grey'); R.R(x0 - 2, y0 + 2, x0 + 2, y0 + h, 'grey')
    s.put(R)
    for k in range(8): blob(s, x0 - 14 + k * 19, H - 6 + r.randint(-2, 2), 12, 8, (T_GREEN, T_DEEP)[k % 2], 6, k)
    shadow(s, x0 - 26, x1 + 26, H - 1)
    return s

def jelly_garden(W=300, H=420, seed=5):
    """빛 해파리 정원(천장에서 내려옴): 이끼·고사리로 덮인 거대한 종 화분 + 빛나는 촉수 덩굴 + 작은 해파리들."""
    s, cx = base(W, H); r = random.Random(seed)
    for x in (cx - 60, cx, cx + 60): s.line((cx, 0), (x, 40), 'greyD')
    bell_y, bw, bh = 40, 200, 70
    G = s.layer(); G.ell(cx - bw / 2 - 8, bell_y + bh - 22, cx + bw / 2 + 8, bell_y + bh + 6, 'skyL'); G.shade(('sky', 'skyL', 'white')); s.put(G)   # 빛나는 밑면
    for k in range(9):   # 종 위를 덮은 잎 덩어리
        a = math.pi + (k + .5) / 9 * math.pi; x = cx + math.cos(a) * bw * .45; y = bell_y + bh - 14 + math.sin(a) * bh * .8
        blob(s, x, y, 30, 22, (T_DARK, T_DEEP, T_GREEN)[k % 3], 7, k)
    blob(s, cx, bell_y + 18, 44, 24, T_GREEN, 8, 77)
    for k in range(9): leaf(s, cx - bw / 2 + 10 + k * 22, bell_y + bh - 14, -PI2 + (k - 4) * .25, 22, 4, T_LIME, 'lance', bend=.2)
    for k in range(11):   # 촉수 덩굴: 길이를 다르게 해서 종 모양 실루엣
        x = cx - bw / 2 + 10 + k * (bw - 20) / 10; mid = 1 - abs(k - 5) / 5
        ln = int(H * (.35 + .45 * mid) - r.randint(0, 30))
        tn = (T_TEAL, T_GREEN, T_SAGE)[k % 3]
        end = vine(s, x, bell_y + bh + 2, ln, k * 7, tn, 3.5, 7, 4)
        flower(s, end, bell_y + bh + ln + 2, ('white', 'skyL', 'pink')[k % 3], 'sky', 3)
        for y in range(bell_y + bh + 20, bell_y + bh + ln, 47): flower(s, x + math.sin(y / 9 + k * 7) * 3, y, ('white', 'pink')[(y // 47 + k) % 2], 'sky', 2)
    for (jx, jy, jr) in [(cx - 130, 130, 18), (cx + 128, 170, 14), (cx - 110, 250, 12), (cx + 120, 290, 16)]:   # 작은 해파리 조명
        s.line((jx, 0), (jx, jy - jr), 'greyD')
        J = s.layer(); J.ell(jx - jr, jy - jr, jx + jr, jy + jr * .3, 'skyL'); J.shade(('sky', 'skyL', 'white')); J.ell(jx - jr * .5, jy - jr * .6, jx + jr * .5, jy - jr * .1, 'pink'); s.put(J)
        for k in range(4): vine(s, jx - jr * .6 + k * jr * .4, jy + jr * .3, int(jr * 3.5), k + jx, T_TEAL, 1.5, 6, 2)
    return s
