import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { resolveShareLink, recordShareLinkView } from "@/lib/shareLink";
import { buildApplicationView } from "@/lib/applicationView";
import { shareUnlockValue, safeEqual, getClientIp } from "@/lib/shareToken";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { ShareLinkNotice } from "@/components/share/ShareLinkNotice";
import { SharePasswordGate } from "@/components/share/SharePasswordGate";
import { ApplicationPublicView } from "@/components/share/ApplicationPublicView";

// 共有リンクごとに内容も閲覧記録も変わるのでキャッシュしない
export const dynamic = "force-dynamic";

// 主催者に渡す私的なURL。検索結果に出てはいけない。
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const requestHeaders = await headers();

  const limit = await checkRateLimit(
    "share-page",
    getClientIp(requestHeaders),
    RATE_LIMITS.publicPage.limit,
    RATE_LIMITS.publicPage.windowSeconds
  );
  if (!limit.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-gray-600">
          アクセスが集中しています。しばらくしてからお試しください。
        </p>
      </div>
    );
  }

  const { status, link } = await resolveShareLink(token);
  if (status !== "ok" || !link) {
    return <ShareLinkNotice status={status as "expired" | "revoked" | "notfound"} />;
  }

  if (link.passwordHash) {
    const cookieStore = await cookies();
    const value = cookieStore.get(`share_unlock_${link.id}`)?.value;
    const expected = shareUnlockValue(link.id, link.passwordHash);
    if (!value || !safeEqual(value, expected)) {
      return <SharePasswordGate token={token} storeName={link.store.name} />;
    }
  }

  const view = await buildApplicationView(link.storeId, token);
  if (!view) return <ShareLinkNotice status="notfound" />;

  // 閲覧記録は表示を妨げない。失敗しても主催者にはページを見せる。
  await recordShareLinkView(link.id, "page", requestHeaders).catch((e) =>
    console.error("Share view record error:", e)
  );

  return <ApplicationPublicView view={view} token={token} />;
}
