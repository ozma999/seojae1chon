/** Supabase 설정이 있으면 실서비스 모드, 없으면 데모 모드(브라우저 저장) */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isLive = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
