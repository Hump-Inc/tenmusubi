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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 主催者の申請が届いたことを運営へ知らせる。承認しないと募集を公開できないので、
 * 管理画面を見に行かなくても気づけるようにする。
 * 却下後の出し直しも審査待ちに戻るので、同じように知らせる。
 */
export async function sendOrganizerApplicationAdminEmail(params: {
  orgName: string;
  contactName: string | null;
  phone: string | null;
  website: string | null;
  intro: string | null;
  userName: string | null;
  userEmail: string | null;
  resubmitted: boolean;
}) {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0 || !process.env.RESEND_API_KEY) return;

  const row = (label: string, value: string | null) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; width: 140px;"><strong>${label}</strong></td>
      <td style="padding: 10px; border: 1px solid #e5e7eb;">${value ? escapeHtml(value).replace(/\n/g, "<br />") : "（なし）"}</td>
    </tr>`;
  const kind = params.resubmitted ? "主催者の再申請" : "主催者の申請";

  await resend.emails.send({
    from: FROM,
    to: adminEmails,
    subject: `【てんむすび】${kind}がありました（${params.orgName}）`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${kind}</h2>
        <p>主催者の${params.resubmitted ? "再申請（却下後の出し直し）" : "申請"}がありました。承認するまで募集は公開できません。内容をご確認ください。</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          ${row("団体名・主催者名", params.orgName)}
          ${row("担当者", params.contactName)}
          ${row("電話番号", params.phone)}
          ${row("Webサイト", params.website)}
          ${row("紹介・実績", params.intro)}
          ${row("アカウント", `${params.userName ?? "（名前未設定）"}（${params.userEmail ?? "-"}）`)}
        </table>
        <p>
          <a href="${BASE_URL}/admin/organizers" style="color: #3b82f6;">
            管理画面で確認する →
          </a>
        </p>
      </div>
    `,
  });
}
