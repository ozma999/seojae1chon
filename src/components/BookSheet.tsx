'use client';
import { useEffect, useState } from 'react';
import type { LibraryEntry } from '@/lib/data/types';
import { GENRE_NAME, thicknessMm } from '@/lib/room/logic';
import type { Genre } from '@/lib/room/types';
import { useLibrary } from './LibraryProvider';

/** 책 상세: 자랑 책장 꽂기/빼기, 자랑 문구, 장르 고치기, 코멘트, 서재에서 빼기 */
export function BookSheet({ entry, onClose }: { entry: LibraryEntry; onClose: () => void }) {
  const { entries, updateEntry, remove, say, bragSlots } = useLibrary();
  const [brag, setBrag] = useState(entry.bragText ?? '');
  const [comment, setComment] = useState(entry.comment ?? '');
  const e = entries.find((x) => x.id === entry.id) ?? entry;
  useEffect(() => {
    const k = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const bragCount = entries.filter((x) => x.bragAt !== null).length;
  const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && say(ok), (err: Error) => say(err.message));
  const toggleBrag = () => {
    if (e.bragAt === null && bragCount >= bragSlots) return say(`자랑 책장 ${bragSlots}칸이 꽉 찼어요. 한 권을 먼저 빼 주세요`);
    run(updateEntry(e.id, { bragAt: e.bragAt === null ? Date.now() : null }), e.bragAt === null ? '자랑 책장에 꽂았어요' : '자랑 책장에서 뺐어요');
  };
  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={e.title} onClick={(ev) => ev.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>{e.title}{e.vol ? ` ${e.vol}` : ''}</h3>
        <p className="muted">{[e.author, e.publisher, e.pubDate].filter(Boolean).join(' · ')}</p>
        <dl className="facts">
          <div><dt>쪽수</dt><dd>{e.pages ? `${e.pages}쪽` : '모름'}</dd></div>
          <div><dt>두께</dt><dd>{thicknessMm(e).toFixed(1)}mm{e.pages ? '' : ' (추정)'}</dd></div>
          <div><dt>형태</dt><dd>{e.format === 'ebook' ? '전자책' : e.hardcover ? '종이책 · 양장' : '종이책'}</dd></div>
          <div><dt>등록</dt><dd>{e.verified ? '실물 인증' : '검색으로 추가'}</dd></div>
        </dl>
        <label className="field">장르 {e.userGenre ? '(직접 고침)' : e.genreSource === 'addcode' ? '(부가기호로 추정)' : '(추정 근거 없음)'}
          <select value={e.genre} onChange={(ev) => run(updateEntry(e.id, { userGenre: ev.target.value as Genre }), '장르를 고쳤어요')}>
            {(Object.keys(GENRE_NAME) as Genre[]).map((g) => <option key={g} value={g}>{GENRE_NAME[g]}</option>)}
          </select>
        </label>
        <button className={e.bragAt === null ? 'btn primary' : 'btn'} onClick={toggleBrag}>
          {e.bragAt === null ? '자랑 책장에 꽂기' : '자랑 책장에서 빼기'}
        </button>
        {e.bragAt !== null && (
          <label className="field">자랑 포인트 (공유 카드에 들어가요)
            <textarea maxLength={80} value={brag} onChange={(ev) => setBrag(ev.target.value)} onBlur={() => brag !== (e.bragText ?? '') && run(updateEntry(e.id, { bragText: brag || null }), '저장했어요')} placeholder="이 책을 왜 자랑하고 싶은지 한두 문장" />
          </label>
        )}
        <label className="field">내 한 줄 코멘트 (다른 사용자에게 보여요)
          <textarea maxLength={140} value={comment} onChange={(ev) => setComment(ev.target.value)} onBlur={() => comment !== (e.comment ?? '') && run(updateEntry(e.id, { comment: comment || null }), '저장했어요')} />
        </label>
        <button className="btn ghost danger" onClick={() => { if (confirm(`'${e.title}'을(를) 서재에서 뺄까요?`)) run(remove(e.id), '서재에서 뺐어요').then(onClose); }}>서재에서 빼기</button>
      </div>
    </div>
  );
}
