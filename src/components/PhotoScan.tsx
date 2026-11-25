'use client';
import { useState } from 'react';
import { useLibrary } from './LibraryProvider';
import { PasteBulk } from './BulkAdd';
import { photoTiles } from '@/lib/books/photo-tiles';
import { PHOTO_MODEL_LABEL, spineQuery, type PhotoModelKey, type ScanResult } from '@/lib/books/photo-shared';

async function scan(file: File, model: PhotoModelKey): Promise<ScanResult> {
  const images = await photoTiles(file);
  const r = await fetch('/api/photo-scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ images, model }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `사진을 읽지 못했어요(${r.status})`);
  return j as ScanResult;
}
const won = (n: number) => (n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString()) + '원';

/** 태초가족: 책장 사진 → AI가 책등을 읽음 → 확인 후 한 번에 꽂기. '세 모델 비교'로 정확도·비용을 볼 수 있다 */
export function PhotoScan({ onClose, onAdd, skip }: { onClose: () => void; onAdd?: (books: import('@/lib/books/nl').BookInfo[]) => Promise<string>; skip?: Set<string> }) {
  const { say } = useLibrary();
  const [model, setModel] = useState<PhotoModelKey>('sonnet');
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [preset, setPreset] = useState<{ lines: string[]; note: string } | null>(null);
  const [cmp, setCmp] = useState<{ key: PhotoModelKey; r?: ScanResult; err?: string }[] | null>(null);

  const run = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, 10);
    if (compare) {
      const keys: PhotoModelKey[] = ['haiku', 'sonnet', 'opus'];
      setCmp(keys.map((key) => ({ key })));
      setBusy('세 모델이 같은 사진을 읽는 중… (최대 1분)');
      await Promise.all(keys.map(async (key) => {
        try { const r = await scan(list[0], key); setCmp((c) => c && c.map((x) => (x.key === key ? { key, r } : x))); }
        catch (e) { setCmp((c) => c && c.map((x) => (x.key === key ? { key, err: (e as Error).message } : x))); }
      }));
      setBusy(null);
      return;
    }
    const lines: string[] = []; let cost = 0, low = 0;
    for (let i = 0; i < list.length; i++) {
      setBusy(`사진 ${i + 1} / ${list.length} 읽는 중…`);
      try {
        const r = await scan(list[i], model);
        r.books.forEach((b) => lines.push(spineQuery(b)));
        cost += r.costKrw; low += r.books.filter((b) => b.confidence === 'low').length;
      } catch (e) { say((e as Error).message); }
    }
    setBusy(null);
    if (!lines.length) { say('책을 찾지 못했어요. 책등이 잘 보이게 다시 찍어 주세요'); return; }
    setPreset({ lines, note: `AI가 ${lines.length}권을 읽었어요${low ? `(흐릿한 ${low}권 포함)` : ''} · 비용 약 ${won(cost)}. 맞는 책만 체크해 주세요.` });
  };

  if (preset) return <PasteBulk onClose={onClose} preset={preset.lines} method="photo" title="사진으로 등록" note={preset.note} onAdd={onAdd} skip={skip} />;
  return (
    <div className="sheetbg">
      <div className="sheet bulk" role="dialog" aria-modal="true" aria-label="사진으로 등록">
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>사진으로 등록 <span className="badge sm">태초가족</span></h3>
        <p className="small muted">책등이 보이게 책장을 찍어 주세요. AI가 책을 한 권씩 읽고, 확인한 책만 꽂아요. 한 번에 10장까지, 한 달에 60장까지 쓸 수 있어요.</p>
        <ul className="small muted howto">
          <li>한 칸씩, 정면에서, 글자가 흔들리지 않게</li>
          <li>사진은 책을 읽는 데만 쓰고 저장하지 않아요</li>
        </ul>
        <div className="chiprow" role="group" aria-label="AI 모델">
          {(['sonnet', 'haiku', 'opus'] as PhotoModelKey[]).map((k) => (
            <button key={k} className="chip" aria-pressed={!compare && model === k} onClick={() => { setCompare(false); setModel(k); }}>{PHOTO_MODEL_LABEL[k]}</button>
          ))}
          <button className="chip" aria-pressed={compare} onClick={() => setCompare(true)}>세 모델 비교</button>
        </div>
        {compare && <p className="small muted">비교는 첫 사진 한 장만, 세 모델로 읽어 권수·시간·비용을 보여 줘요(사진 3장으로 계산돼요).</p>}
        <label className={`btn primary${busy ? ' disabled' : ''}`}>
          {busy ?? (compare ? '비교할 사진 고르기' : '사진 고르기 · 찍기')}
          <input type="file" accept="image/*" multiple={!compare} hidden disabled={!!busy} onChange={(e) => { run(e.target.files); e.target.value = ''; }} />
        </label>
        {cmp && (
          <div className="cmp">
            {cmp.map(({ key, r, err }) => (
              <section key={key} className="card">
                <h2>{PHOTO_MODEL_LABEL[key]}</h2>
                {err ? <p className="err small">{err}</p> : !r ? <p className="muted small">읽는 중…</p> : (
                  <>
                    <p className="small"><b>{r.books.length}권</b> · {(r.ms / 1000).toFixed(1)}초 · 약 {won(r.costKrw)} <span className="muted">(입력 {r.inTok.toLocaleString()} / 출력 {r.outTok.toLocaleString()} 토큰)</span></p>
                    <ol className="small spines">{r.books.map((b, i) => <li key={i} className={b.confidence === 'low' ? 'muted' : ''}>{spineQuery(b)}{b.author ? ` · ${b.author}` : ''}{b.confidence === 'low' ? ' (흐릿)' : ''}</li>)}</ol>
                    <button className="btn sm" onClick={() => setPreset({ lines: r.books.map(spineQuery), note: `${PHOTO_MODEL_LABEL[key]} 결과 ${r.books.length}권. 맞는 책만 체크해 주세요.` })}>이 결과로 등록</button>
                  </>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
