'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { cleanRoomName, randomRoomName } from '@/lib/room/names';
import { useRouter, useSearchParams } from 'next/navigation';
import { isLive } from '@/lib/supabase/env';
import { supabaseBrowser } from '@/lib/supabase/client';
import { demoReset } from '@/lib/data/demo';
import { passwordRules, RULE_TEXT } from '@/lib/auth/password';


export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}
function Login() {
  const router = useRouter();
  const live = isLive();
  const sp = useSearchParams();
  const invited = (sp.get('code') ?? '').toUpperCase().slice(0, 6);
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>(invited || sp.get('join') ? 'up' : 'in');
  const ERR: Record<string, string> = {
    device: '링크를 요청한 휴대폰(같은 브라우저)에서 열어 주세요. 다른 기기에서 열면 보안 때문에 동작하지 않아요. 비밀번호를 잊었다면 다시 요청해 주세요.',
    expired: '링크가 만료됐거나 이미 쓴 링크예요. 다시 요청해 주세요.',
    link: '링크가 올바르지 않아요. 메일의 버튼을 다시 눌러 주세요.',
  };
  const linkErr = ERR[sp.get('err') ?? ''];
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [code, setCode] = useState(invited);
  const [roomName, setRoomName] = useState('');
  const [msg, setMsg] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const rules = passwordRules(email, pw, pw2);
  const okUp = Object.values(rules).every(Boolean) && /^[A-Za-z0-9]{6}$/.test(code) && email.includes('@');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!live) { demoReset(mode === 'up'); router.push('/room'); return; }
    const sb = supabaseBrowser();
    setBusy(true); setMsg(null);
    try {
      if (mode === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw new Error(error.message.includes('Invalid') ? '이메일이나 비밀번호가 맞지 않아요' : error.message);
        router.push('/room'); router.refresh();
      } else if (mode === 'up') {
        const { data: valid } = await sb.rpc('check_invite', { p_code: code });
        if (!valid) throw new Error('초대 코드가 맞지 않거나 이미 쓰였어요');
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: {
          data: { invite_code: code.toUpperCase(), room_name: cleanRoomName(roomName) || randomRoomName() }, emailRedirectTo: `${location.origin}/auth/callback?next=/room` } });
        if (error) throw new Error(/pwned|leaked/i.test(error.message) ? '이미 유출된 적 있는 비밀번호예요. 다른 비밀번호를 써 주세요'
          : /weak|password/i.test(error.message) ? '비밀번호가 약해요. 소문자·대문자·숫자·기호를 모두 넣어 8자 이상으로 써 주세요' : error.message);
        if (data.session) { router.push('/room'); router.refresh(); }
        else setMsg('인증 메일을 보냈어요. 메일의 링크를 누르면 빈 서재가 열려요.');
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/login/new-password` });
        if (error) throw error;
        setMsg('비밀번호 재설정 링크를 보냈어요(30분 동안 유효).');
      }
    } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="login">
      <Link href="/" className="loginlogo"><Image src="/brand/logo-h-light.png" alt="서재일촌" width={268} height={92} className="logoimg hero" priority /></Link>
      <p className="muted">책이 쌓일수록 넓어지는 픽셀 서재</p>
      {linkErr && <p className="note" role="alert">{linkErr}</p>}
      {!live && <p className="demobar">데모 모드예요. Supabase를 연결하기 전에는 이 브라우저에만 저장돼요.</p>}
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'in'} onClick={() => setMode('in')}>로그인</button>
        <button role="tab" aria-selected={mode === 'up'} onClick={() => setMode('up')}>가입</button>
      </div>
      <form onSubmit={submit} className="stack">
        <label className="field">이메일<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required={live} /></label>
        {mode !== 'reset' && (
          <label className="field">비밀번호<input type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} required={live} /></label>
        )}
        {mode === 'up' && (
          <>
            <label className="field">비밀번호 확인<input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
            <ul className="rules">{RULE_TEXT.map(([k, t]) => <li key={k} className={rules[k] ? 'ok' : ''}>{t}</li>)}</ul>
            <p className="muted small">다른 사이트에서 쓰지 않는 새 비밀번호를 써 주세요. 이미 유출된 비밀번호는 가입이 막혀요.</p>
            <label className="field">서재 이름 <span className="muted small">(비우면 추천 이름)</span><input value={roomName} maxLength={20} placeholder="예: 새벽서가, 만화방 주인" onChange={(e) => setRoomName(e.target.value)} /></label>
            <label className="field">초대 코드 6자리<input value={code} maxLength={6} autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
          </>
        )}
        <button className="btn primary" disabled={busy || (live && mode === 'up' && !okUp)}>
          {mode === 'in' ? '로그인' : mode === 'up' ? '가입하고 빈 방 받기' : '재설정 링크 보내기'}
        </button>
        {msg && <p className="note" role="status">{msg}</p>}
      </form>
      {mode === 'in' && <button className="link" onClick={() => setMode('reset')}>비밀번호를 잊었어요</button>}
      {!live && <button className="btn ghost" onClick={() => { demoReset(false); router.push('/room'); }}>샘플 서재 둘러보기</button>}
    </main>
  );
}
