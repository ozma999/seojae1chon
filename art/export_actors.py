# 걸어 다니는 캐릭터 시트: 머리×옷 조합마다 PNG 한 장(프레임 가로로) + public/art/actor.json
# 앱은 필요한 조합만 불러온다(내 서재 1장, 일촌 방문 2장). 새 머리·옷이 늘어도 조합 파일만 늘어난다.
import json, os, hashlib, io
from PIL import Image
import avatar2, avatar9
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'art', 'actor')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.png'): os.remove(os.path.join(OUT, f))
W, H = avatar2.W, avatar2.H
hairs = [h for h, _ in avatar9.HAIRS]; outs = [o for o, _, _ in avatar9.OUTFITS]
sheets = []; index = None; total = 0
for hk in hairs:
    row = []
    for ok in outs:
        F = avatar2.frames(hk, ok)
        if index is None:
            index = {}
            for i, (name, k, _) in enumerate(F): index.setdefault(name, [i, 0])[1] += 1
        im = Image.new('RGBA', (W * len(F), H), (0, 0, 0, 0))
        for i, (_, _, fr) in enumerate(F): im.alpha_composite(fr, (i * W, 0))
        buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True); raw = buf.getvalue()
        fn = f'{hk}-{ok}.{hashlib.sha1(raw).hexdigest()[:8]}.png'
        open(os.path.join(OUT, fn), 'wb').write(raw); total += len(raw)
        row.append('actor/' + fn)
    sheets.append(row)
json.dump(dict(w=W, h=H, frames=index, sheets=sheets), open(os.path.join(OUT, '..', 'actor.json'), 'w'), ensure_ascii=False)
print(len(hairs) * len(outs), 'sheets', total // 1024, 'KB total,', total // len(hairs) // len(outs), 'B each', index)
