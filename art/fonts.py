# 한글 폰트를 OS별로 찾아 쓰는 헬퍼 (썸네일 시트 라벨용)
import os
from PIL import ImageFont
CANDS={True:['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc',
             '/System/Library/Fonts/AppleSDGothicNeo.ttc','C:/Windows/Fonts/malgunbd.ttf'],
       False:['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
              '/System/Library/Fonts/AppleSDGothicNeo.ttc','C:/Windows/Fonts/malgun.ttf']}
def get(size,bold=False):
    for p in CANDS[bold]:
        if os.path.exists(p): return ImageFont.truetype(p,size)
    return ImageFont.load_default()
OUT=os.environ.get('SEOJAE_OUT','out'); os.makedirs(OUT,exist_ok=True)
def out(name): return os.path.join(OUT,name)
