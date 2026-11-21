'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { passwordRules } from '@/lib/auth/password';

export default function NewPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [msg, setMsg] = useState<string | null>(null);
  const ok = Object.values(passwordRules('', pw, pw2)).every(Boolean);
  return (
    <main className="login">
      <h1 className="h">새 비밀번호</h1>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
        if (error) setMsg(error.message); else router.push('/room');
      }}>
        <label className="field">새 비밀번호<input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        <label className="field">확인<input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
        <p className="muted small">8자 이상, 영문과 숫자를 함께</p>
        <button className="btn primary" disabled={!ok}>바꾸기</button>
        {msg && <p className="note">{msg}</p>}
      </form>
    </main>
  );
}
