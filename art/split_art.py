# art2.json(이미지 내장) → public/art/ 의 PNG 파일 + manifest.json (앱용)
import json, base64, os, sys, hashlib
src = sys.argv[1] if len(sys.argv) > 1 else 'art2.json'
out = sys.argv[2] if len(sys.argv) > 2 else '../public/art'
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith('.png'): os.remove(os.path.join(out, f))
d = json.load(open(src, encoding='utf-8'))
def save(durl, name):
    raw = base64.b64decode(durl.split(',', 1)[1])
    h = hashlib.sha1(raw).hexdigest()[:8]          # 내용 해시를 붙여 캐시 무효화
    fn = f'{name}.{h}.png'
    open(os.path.join(out, fn), 'wb').write(raw)
    return fn
for li, L in enumerate(d['levels']):
    L.pop('img', None)
    L['bg'] = {tk: save(u, f'lv{li+1}-bg-{tk}') for tk, u in L['bg'].items()}
    for wi, w in enumerate(L['win']):
        w['img'] = {tk: {td: save(u, f'lv{li+1}-win{wi}-{tk}-{["dawn","day","dusk","night"][d["tods"].index(td)]}') for td, u in v.items()}
                    for tk, v in w['img'].items()}
    for ii, it in enumerate(L['items']):
        it['img'] = save(it['img'], f'lv{li+1}-item{ii:02d}-{it["id"]}')
d['avatar']['img'] = save(d['avatar']['img'], 'avatar-sheet')
json.dump(d, open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False)
n = len([f for f in os.listdir(out) if f.endswith('.png')])
size = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
print(f'{n} png, manifest {os.path.getsize(os.path.join(out,"manifest.json"))//1024}KB, total {size//1024}KB')
