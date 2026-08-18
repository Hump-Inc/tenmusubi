import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * 共有リンクのトークン。
 * 既存の randomUUID() ではなく乱数バイト列を使う。共有URLは主催者にメールで渡り、
 * 転送もされる前提なので、推測されないことが要件になるため。
 */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

function salt(): string {
  // IPハッシュ用のソルト。専用の値が無ければ AUTH_SECRET を流用する。
  return process.env.IP_HASH_SALT || process.env.AUTH_SECRET || "tenmusubi-share";
}

/**
 * 生IPは保存しない。ソルト付きハッシュのみを残す。
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${salt()}:ip:${ip}`).digest("hex");
}

export function hashUserAgent(ua: string): string {
  return createHash("sha256").update(`${salt()}:ua:${ua}`).digest("hex");
}

/**
 * リクエスト元IPを取り出す。Vercel は x-forwarded-for を付与する。
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

/**
 * 共有リンクの閲覧パスワード用クッキーの値。
 * パスワードそのものはクッキーに載せず、リンクIDとハッシュから導出した値を置く。
 */
export function shareUnlockValue(linkId: string, passwordHash: string): string {
  return createHash("sha256")
    .update(`${salt()}:unlock:${linkId}:${passwordHash}`)
    .digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
