# seojae-art-src — 서재일촌 아트 소스

필요: Python 3.10+ / `pip install Pillow`

## 파일
- lib.py: 렌더러 핵심(32색 팔레트 PAL32, Scene 클래스) / sprite.py: lib가 import
- scenes.py: 방 장면·소품 함수 / rooms.py: 빈 방 + 아이템 레이어 + 대표 책 테마 4종(최신)
- avatar9.py: 확정 아바타(헤어 8 × 옷 8) / windows.py: 창밖 풍경 64 / materials.py: 재질 64
- export_art.py: art.json(아바타 시트) 생성 / fonts.py: OS별 한글 폰트·출력 폴더
- plantpx.py(식물 도트 규칙) · plantcat.py(식물 72종) · planttrees.py(상징목 3종) · export_plants.py(→ ../public/art/plants/ + plants.json, 방마다 심는 자리)
- art.json, art2.json: 현재 아트 데이터. art2.json이 HTML의 `const ART={...};`에 들어가는 최종본

## 실행 (이 폴더에서)
```
python3 export_art.py   # art.json 재생성 (선택, 이미 들어 있음)
python3 rooms.py        # art2.json + empty_lv*.png + preview_lv*.png 생성, 레벨별 수용량 출력
python3 avatar9.py      # out/ 에 아바타 시트
python3 windows.py      # out/window-views-64.png
python3 materials.py    # out/materials-64.png
```
시트 출력 폴더는 환경변수 SEOJAE_OUT으로 바꿀 수 있음(기본 ./out).

## HTML 반영
pixel-library-plan.html에서 `const ART=` 로 시작하는 줄의 JSON을 art2.json 내용으로 교체.
