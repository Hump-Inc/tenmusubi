import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "てんむすび <noreply@tenmusubi.net>";
const BASE_URL = process.env.AUTH_URL || "http://localhost:3000";

/**
 * 運営宛ての通知先メールアドレスを取得する。
 * `CONTACT_EMAIL` はカンマ区切りで複数指定可能（例: "a@x.co.jp,b@y.co.jp"）。
 * 未設定の場合は空配列を返す（呼び出し側で通知スキップの判定に使う）。
 */
export function getAdminEmails(): string[] {
  return (process.env.CONTACT_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "【てんむすび】メールアドレスの確認",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
        <h2 style="color: #d35f2d;">てんむすび</h2>
        <p>ご登録ありがとうございます。</p>
        <p>以下のボタンをクリックして、メールアドレスを確認してください。</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #d35f2d; color: white; padding: 12px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
            メールアドレスを確認する
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">このリンクは24時間有効です。</p>
        <p style="font-size: 14px; color: #666;">ボタンが動作しない場合は、以下のURLをブラウザに貼り付けてください：</p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">このメールに心当たりがない場合は、無視してください。</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "【てんむすび】パスワードのリセット",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
        <h2 style="color: #d35f2d;">てんむすび</h2>
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #d35f2d; color: white; padding: 12px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
            パスワードをリセットする
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">このリンクは1時間有効です。</p>
        <p style="font-size: 14px; color: #666;">ボタンが動作しない場合は、以下のURLをブラウザに貼り付けてください：</p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">このメールに心当たりがない場合は、無視してください。パスワードは変更されません。</p>
      </div>
    `,
  });
}
