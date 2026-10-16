/**
 * リクエスト元IPを取り出す。Vercel は x-forwarded-for を付与する。
 *
 * auth.ts 経由でミドルウェア（Edge）にも読み込まれるので、Node.js 専用の
 * モジュール（crypto など）を import しないこと。
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
