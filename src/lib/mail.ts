import 'server-only';
import nodemailer from 'nodemailer';

/** 알림 메일(SMTP). Supabase 인증 메일에 쓴 SMTP와 같은 값을 Vercel 환경변수에 넣으면 된다 */
export function mailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 465);
  return nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}
export const MAIL_FROM = () => process.env.MAIL_FROM || process.env.SMTP_USER || '';
