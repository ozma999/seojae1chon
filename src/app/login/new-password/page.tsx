'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { passwordRules, RULE_TEXT } from '@/lib/auth/password';

export default function NewPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [msg, setMsg] = useState<string | null>(null);
  const rules = passwordRules('', pw, pw2), ok = Object.values(rules).every(Boolean);
  return (
    <main className="login">
      <h1 className="h">새 비밀번호</h1>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
        if (error) setMsg(/session/i.test(error.message) ? '재설정 링크로 들어오지 않았거나 시간이 지났어요. 로그인 화면에서 비밀번호 재설정을 다시 요청해 주세요.' : /weak|password/i.test(error.message) ? '비밀번호가 약해요. 소문자·대문자·숫자·기호를 모두 넣어 8자 이상으로 써 주세요' : error.message);
        else router.push('/room');
      }}>
        <label className="field">새 비밀번호<input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <label className="field">확인<input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
        <ul className="rules">{RULE_TEXT.filter(([k]) => k !== 'mail').map(([k, t]) => <li key={k} className={rules[k] ? 'ok' : ''}>{t}</li>)}</ul>
        <button className="btn primary" disabled={!ok}>바꾸기</button>
        {msg && <p className="note">{msg}</p>}
      </form>
    </main>
  );
}
