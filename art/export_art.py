import json,base64,io,importlib
import scenes
from PIL import Image
from avatar9 import make,HAIRS,OUTFITS
out=[]
names=['클로즈업','방','큰 서재','복층 서재']
for li,fn in enumerate([lambda:scenes.lv1('m','x',True),lambda:scenes.lv2(True),lambda:scenes.lv3(True),lambda:scenes.lv4(True)]):
    s=fn();s.quantize()
    buf=io.BytesIO();s.im.save(buf,'PNG')
    out.append(dict(name=names[li],W=s.W,H=s.H,img='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode(),
                    slots=s.slots,brag=s.bragslots,foot=s.foot,sidecap=s.books))
    s.im.save(f'bg_lv{li+1}.png')
# avatar sheet: rows=hair(8), cols=outfit(8)*breath(2)
W,H=28,47
sheet=Image.new('RGBA',(W*16,H*8),(0,0,0,0))
for i,(hk,_) in enumerate(HAIRS):
    for j,(ok,_,_) in enumerate(OUTFITS):
        for b in (0,1):
            im=make(hk,ok,hood='s' if ok=='hoodie' else None,breath=b)
            sheet.paste(im,((j*2+b)*W,i*H),im)
buf=io.BytesIO();sheet.save(buf,'PNG');sheet.save('avatar_sheet.png')
data=dict(levels=out,avatar=dict(img='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode(),w=W,h=H,
     hairs=[h[1] for h in HAIRS],outfits=[o[1] for o in OUTFITS]))
open('art.json','w').write(json.dumps(data,ensure_ascii=False))
print([ (l['name'],len(l['slots']),l['brag'],l['foot']) for l in out ], len(json.dumps(data))//1024,'KB')
