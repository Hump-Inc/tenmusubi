import { prisma } from "./prisma";

/**
 * 固定ウィンドウのレート制限。
 * Vercel はリクエストごとにインスタンスが替わりうるため、モジュールスコープの
 * カウンタでは制限が効かない。カウンタは Turso 側に置く。
 */
export async function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number }> {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const id = `${bucket}:${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  try {
    const counter = await prisma.rateLimitCounter.upsert({
      where: { id },
      create: { id, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });

    // 期限切れレコードの掃除。毎回やるとコストになるので確率的に実行する。
    if (Math.random() < 0.01) {
      await prisma.rateLimitCounter
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => {});
    }

    return { ok: counter.count <= limit, remaining: Math.max(0, limit - counter.count) };
  } catch {
    // カウンタが引けない場合に機能全体を止めたくないので通す（フェイルオープン）
    return { ok: true, remaining: limit };
  }
}

export const RATE_LIMITS = {
  /** 公開ページ: 1IPあたり 60req/分 */
  publicPage: { limit: 60, windowSeconds: 60 },
  /** スペース登録フォーム: 1IPあたり 5req/時 */
  spaceLead: { limit: 5, windowSeconds: 60 * 60 },
} as const;
