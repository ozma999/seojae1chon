# 식물 정원: 식물 스프라이트(public/art/plants/*.png) + 목록·심는 자리(public/art/plants.json)
#   python3 export_plants.py            (art/ 에서 실행)
# 10권마다 씨앗 1개. 식물마다 씨앗 값이 있고, 방마다 정해진 자리에만 심는다.
#   slot 종류: floor(바닥, size L/M) · top(책장 위·창틀·책 더미 위) · hang(천장) · wall(평평한 벽·창가) · pillar(기둥, 아이비만)
#              rail(복층 난간) · bed(바닥 화단 자리) · sym(상징목, 방마다 하나)
import os, json, hashlib, io, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plantcat as P
import planttrees as T

# id, 이름, 그리는 함수, 분류, 씨앗, 심는 자리, 기준점(bottom=화분 바닥 / top=매다는 끈 끝), 필요한 책 수
L4 = 1000
PLANTS = [
 # 큰 바닥 화분(씨앗 4) — 바닥 L 자리
 ('monstera', '몬스테라', lambda: P.monstera(80), 'L', 4, 'floorL', 'bottom', 0),
 ('fiddle', '떡갈고무나무', lambda: P.fiddle(120), 'L', 4, 'floorL', 'bottom', 0),
 ('kentia', '켄차 야자', lambda: P.kentia(130), 'L', 4, 'floorL', 'bottom', 0),
 ('areca', '아레카 야자', lambda: P.areca(110), 'L', 4, 'floorL', 'bottom', 0),
 ('banana', '바나나 나무', lambda: P.banana(150), 'L', 4, 'floorL', 'bottom', 0),
 ('bird', '극락조', lambda: P.bird(120), 'L', 4, 'floorL', 'bottom', 0),
 ('alocasia', '알로카시아', lambda: P.alocasia(110), 'L', 4, 'floorL', 'bottom', 0),
 ('olive', '올리브 나무', lambda: P.olive(110), 'L', 4, 'floorL', 'bottom', 0),
 ('lemon', '레몬나무', lambda: P.lemon(110), 'L', 4, 'floorL', 'bottom', 0),
 ('traveler', '여인초', lambda: P.traveler(150), 'L', 4, 'floorL', 'bottom', 0),
 ('pachira', '파키라', lambda: P.pachira(110), 'L', 4, 'floorL', 'bottom', 0),
 ('dracaena', '드라세나', lambda: P.dracaena(120), 'L', 4, 'floorL', 'bottom', 0),
 ('rubber', '고무나무', lambda: P.rubber(110), 'L', 4, 'floorL', 'bottom', 0),
 ('treefern', '나무고사리', lambda: P.treefern(130), 'L', 4, 'floorL', 'bottom', 0),
 ('bamboo', '대나무', lambda: P.bamboo(140), 'L', 4, 'floorL', 'bottom', 0),
 ('papyrus', '파피루스 수반', lambda: P.papyrus(110), 'L', 4, 'floorL', 'bottom', 0),
 ('kelptank', '켈프 수조', lambda: P.kelp_tank(130), 'L', 4, 'floorL', 'bottom', 0),
 ('agave', '아가베', lambda: P.agave(80), 'L', 4, 'floorL', 'bottom', 0),
 # 중간 화분(씨앗 2) — 바닥 L·M 자리
 ('hydrangea', '수국', lambda: P.hydrangea(50), 'M', 2, 'floorM', 'bottom', 0),
 ('cactuscol', '기둥 선인장', lambda: P.cactus_col(70), 'M', 2, 'floorM', 'bottom', 0),
 ('snake', '산세베리아', lambda: P.snake(60), 'M', 2, 'floorM', 'bottom', 0),
 ('fernstand', '고사리 화분대', lambda: P.fern_stand(60), 'M', 2, 'floorM', 'bottom', 0),
 ('calathea', '칼라테아', lambda: P.calathea(55), 'M', 2, 'floorM', 'bottom', 0),
 ('peacelily', '스파티필름', lambda: P.peace_lily(55), 'M', 2, 'floorM', 'bottom', 0),
 ('aglaonema', '아글라오네마', lambda: P.aglaonema(50), 'M', 2, 'floorM', 'bottom', 0),
 ('selloum', '셀렘', lambda: P.selloum(60), 'M', 2, 'floorM', 'bottom', 0),
 ('zz', '금전수', lambda: P.zz(55), 'M', 2, 'floorM', 'bottom', 0),
 ('anthurium', '안스리움', lambda: P.anthurium(50), 'M', 2, 'floorM', 'bottom', 0),
 ('coffee', '커피나무', lambda: P.coffee(70), 'M', 2, 'floorM', 'bottom', 0),
 ('eucalyptus', '유칼립투스', lambda: P.eucalyptus(70), 'M', 2, 'floorM', 'bottom', 0),
 ('coral', '산호 선인장', lambda: P.coral_cactus(50), 'M', 2, 'floorM', 'bottom', 0),
 ('roses', '장미', lambda: P.roses(50), 'M', 2, 'floorM', 'bottom', 0),
 ('lavender', '라벤더', lambda: P.lavender(50), 'M', 2, 'floorM', 'bottom', 0),
 ('sunflower', '해바라기', lambda: P.sunflower(70), 'M', 2, 'floorM', 'bottom', 0),
 # 작은 화분(씨앗 1) — 책장 위·창틀·창가 의자
 ('succulent', '다육이', lambda: P.succulent(), 'S', 1, 'top', 'bottom', 0),
 ('ballcactus', '꽃 선인장', lambda: P.ball_cactus(), 'S', 1, 'top', 'bottom', 0),
 ('tulips', '튤립', lambda: P.tulips(), 'S', 1, 'top', 'bottom', 0),
 ('violet', '바이올렛', lambda: P.violet(), 'S', 1, 'top', 'bottom', 0),
 ('terrarium', '테라리움', lambda: P.terrarium(), 'S', 1, 'top', 'bottom', 0),
 ('basil', '바질', lambda: P.basil(), 'S', 1, 'top', 'bottom', 0),
 ('stucky', '스투키', lambda: P.stucky(), 'S', 1, 'top', 'bottom', 0),
 ('pothosshelf', '흘러내리는 스킨답서스', lambda: P.pothos_shelf(), 'S', 1, 'top', 'pot', 0),
 ('pilea', '필레아', lambda: P.pilea(), 'S', 1, 'top', 'bottom', 0),
 ('marimo', '마리모 병', lambda: P.marimo(), 'S', 1, 'top', 'bottom', 0),
 ('kokedama', '코케다마', lambda: P.kokedama(), 'S', 1, 'top', 'bottom', 0),
 ('shellair', '조개 에어플랜트', lambda: P.shell_air(), 'S', 1, 'top', 'bottom', 0),
 ('haworthia', '하월시아', lambda: P.haworthia(), 'S', 1, 'top', 'bottom', 0),
 ('rosemary', '로즈마리', lambda: P.rosemary(), 'S', 1, 'top', 'bottom', 0),
 ('daisy', '데이지', lambda: P.daisy(), 'S', 1, 'top', 'bottom', 0),
 ('minitank', '미니 산호 수조', lambda: P.mini_tank(), 'S', 1, 'top', 'bottom', 0),
 # 행잉(씨앗 2)
 ('hangpothos', '마크라메 스킨답서스', lambda: P.hang_pothos(90), 'H', 2, 'hang', 'top', 0),
 ('pearls', '구슬 덩굴', lambda: P.hang_pearls(80), 'H', 2, 'hang', 'top', 0),
 ('hangfern', '행잉 고사리', lambda: P.hang_fern(60), 'H', 2, 'hang', 'top', 0),
 ('airorb', '틸란드시아 유리구슬', lambda: P.air_orb(46), 'H', 2, 'hang', 'top', 0),
 ('hoya', '호야', lambda: P.hoya(70), 'H', 2, 'hang', 'top', 0),
 ('rhipsalis', '립살리스', lambda: P.rhipsalis(80), 'H', 2, 'hang', 'top', 0),
 ('staghornball', '박쥐란 볼', lambda: P.staghorn_ball(60), 'H', 2, 'hang', 'top', 0),
 ('jellyhang', '해파리 행잉', lambda: P.jelly_hang(100), 'H', 2, 'hang', 'top', 0),
 ('ivybasket', '아이비 바구니', lambda: P.ivy_basket(64), 'H', 2, 'hang', 'top', 0),
 ('spanishmoss', '수염 틸란드시아', lambda: P.spanish_moss(56), 'H', 2, 'hang', 'top', 0),
 # 벽걸이(씨앗 2)
 ('staghorn', '박쥐란 판', lambda: P.staghorn_board(40), 'W', 2, 'wall', 'bottom', 0),
 ('wallshelf', '벽 선반 화분', lambda: P.wall_shelf(36), 'W', 2, 'wall', 'bottom', 0),
 ('mossframe', '이끼 액자', lambda: P.moss_frame(30), 'W', 2, 'wall', 'bottom', 0),
 ('ivy', '벽 아이비', lambda: P.ivy_wall(150, 18, 2), 'W', 2, 'pillar', 'bottom', 0),
 ('greenpanel', '수직 정원 패널', lambda: P.green_panel(60), 'W', 2, 'wall', 'bottom', 0),
 ('walltank', '벽 어항', lambda: P.wall_tank(40), 'W', 2, 'wall', 'bottom', 0),
 ('ring', '링 행잉', lambda: P.ring_planter(40), 'W', 2, 'wall', 'bottom', 0),
 ('seaweed', '해초 액자', lambda: P.seaweed_frame(36), 'W', 2, 'wall', 'bottom', 0),
 # 온실 소품(1000권부터)
 ('bed', '바닥 화단', lambda: P.planter_bed(190, 74, 19), 'G', 6, 'bed', 'bottom', L4),
 ('railplanter', '난간 플랜터', lambda: P.rail_planter(48), 'G', 3, 'rail', 'bottom', L4),
 ('vinecurtain', '덩굴 커튼', lambda: P.vine_curtain(48, 34, 8), 'G', 4, 'railTop', 'top', L4),
 ('plantladder', '계단 화분대', lambda: P.plant_ladder(56), 'G', 5, 'floorM', 'bottom', L4),
 # 상징목(1000권부터, 방마다 하나)
 ('banyan', '숲의 지붕 · 반얀 우산나무', lambda: T.banyan(440, 440), 'SYM', 20, 'sym', 'bottom', L4),
 ('kelpcolumn', '바다 기둥 · 켈프 수조', lambda: T.kelp_column(150, 440), 'SYM', 20, 'sym', 'bottom', L4),
 ('jellygarden', '빛 해파리 정원', lambda: T.jelly_garden(320, 400), 'SYM', 20, 'symTop', 'top', L4),
]
CATS = [('L', '큰 화분'), ('M', '중간 화분'), ('S', '작은 화분'), ('H', '행잉'), ('W', '벽걸이'), ('G', '온실'), ('SYM', '상징목')]

# ---------- 방마다 심는 자리 ----------
# floor: [x, 바닥 y, 'L'|'M'] (L 자리엔 큰·중간 모두, M 자리엔 중간만)
# top/wall/pillar/rail/bed: [x, 바닥 y]   hang: [x, 천장 y]   sym: [x, 바닥 y, 천장 y]
# 같은 종류 안에서 번호 순서가 방마다 비슷한 위치(뒤쪽 구석 → 앞쪽)가 되게 → 방이 넓어져도 비슷한 자리로 옮겨 간다
SLOTS = [
 dict(floor=[[256, 152, 'M'], [108, 146, 'M'], [184, 146, 'M'], [20, 214, 'M'], [232, 214, 'M']], top=[[200, 56], [226, 56], [132, 84], [156, 84]], hang=[[112, 12], [176, 12]], wall=[[144, 120]]),
 dict(floor=[[14, 214, 'L'], [370, 214, 'L'], [300, 248, 'L'], [130, 204, 'M'], [262, 204, 'M'], [30, 286, 'M'], [356, 286, 'M'], [70, 214, 'M']], top=[[122, 40], [146, 40], [240, 40], [264, 40], [288, 40], [180, 92], [204, 92]], hang=[[162, 12], [222, 12], [330, 14], [60, 14]], wall=[[192, 154]]),
 dict(floor=[[30, 300, 'L'], [482, 300, 'L'], [120, 282, 'L'], [420, 282, 'L'], [40, 382, 'L'], [472, 382, 'L'], [330, 280, 'M'], [205, 280, 'M'], [130, 378, 'M'], [380, 380, 'M']], top=[[238, 240], [278, 240]], hang=[[120, 23], [170, 23], [340, 23], [400, 23], [30, 30], [482, 30]], wall=[[258, 226]], pillar=[[227, 266], [285, 266]]),
 dict(floor=[[92, 426, 'L'], [690, 428, 'L'], [176, 422, 'L'], [604, 422, 'L'], [262, 426, 'L'], [500, 426, 'L'], [40, 500, 'L'], [744, 500, 'L'], [36, 574, 'L'], [744, 574, 'L'], [330, 574, 'M'], [470, 574, 'M']], top=[[262, 481], [611, 506], [358, 374], [410, 374]], hang=[[40, 28], [100, 18], [155, 18], [290, 18], [480, 18], [615, 18], [670, 18], [728, 28]], wall=[[384, 372]], pillar=[[335, 404], [433, 404], [335, 206], [433, 206]], rail=[[94, 188], [144, 188], [194, 188], [464, 188], [514, 188], [628, 188], [678, 188]], bed=[[150, 568], [640, 572]], sym=[[384, 446, 8]]),
]

def foot_width(im, ay):
    """화분 바닥(기준선 바로 위 3줄)의 폭 → 캐릭터가 피해 가는 폭"""
    a = im.split()[3].load(); xs = [x for y in range(max(0, ay - 3), ay + 1) for x in range(im.width) if a[x, y]]
    return (max(xs) - min(xs) + 1) if xs else im.width // 3

def export(out='../public/art'):
    pdir = os.path.join(out, 'plants'); os.makedirs(pdir, exist_ok=True)
    for f in os.listdir(pdir):
        if f.endswith('.png'): os.remove(os.path.join(pdir, f))
    items = []
    for pid, name, fn, cat, seeds, slot, anchor, unlock in PLANTS:
        s = fn(); W = s.W - 2 * s.ox; H = s.H - s.oy; cx = s.ox + W // 2
        if anchor == 'top': ax, ay = cx, s.oy
        elif anchor == 'pot': ax, ay = cx, s.oy + 12        # 책장 위에 놓고 아래로 흘러내리는 화분: 화분 바닥이 기준
        else: ax, ay = cx, s.oy + H - 2
        bb = s.im.getbbox(); im = s.im.crop(bb); ax -= bb[0]; ay -= bb[1]
        b = io.BytesIO(); im.save(b, 'PNG', optimize=True); raw = b.getvalue()
        fn_ = f'{pid}.{hashlib.sha1(raw).hexdigest()[:8]}.png'; open(os.path.join(pdir, fn_), 'wb').write(raw)
        it = dict(id=pid, name=name, cat=cat, seeds=seeds, slot=slot, img='plants/' + fn_, w=im.width, h=im.height, ax=ax, ay=ay, unlock=unlock)
        if anchor in ('bottom',) and slot.startswith('floor') or slot in ('sym', 'bed'): it['foot'] = foot_width(im, min(ay, im.height - 1))
        items.append(it)
    data = dict(plants=items, cats=[dict(id=k, name=n) for k, n in CATS], slots=SLOTS, seedEvery=10)
    json.dump(data, open(os.path.join(out, 'plants.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    size = sum(os.path.getsize(os.path.join(pdir, f)) for f in os.listdir(pdir))
    print(f'{len(items)} plants, {size // 1024}KB')

if __name__ == '__main__':
    export()
