import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { resolveShareLink, recordShareLinkView } from "@/lib/shareLink";
import { buildApplicationView } from "@/lib/applicationView";
import { shareUnlockValue, safeEqual, getClientIp } from "@/lib/shareToken";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { ShareLinkNotice } from "@/components/share/ShareLinkNotice";
import { SharePasswordGate } from "@/components/share/SharePasswordGate";
import { ApplicationPrintSheet } from "@/components/share/ApplicationPrintSheet";
import { PrintToolbar } from "@/components/share/PrintToolbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharePrintPage({
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
    if (!value || !safeEqual(value, shareUnlockValue(link.id, link.passwordHash))) {
      return <SharePasswordGate token={token} storeName={link.store.name} />;
    }
  }

  const view = await buildApplicationView(link.storeId, token);
  if (!view) return <ShareLinkNotice status="notfound" />;

  // 書類作成ニーズが実在するかを測るため、印刷ページの表示も数える
  await recordShareLinkView(link.id, "print", requestHeaders).catch((e) =>
    console.error("Print view record error:", e)
  );

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <PrintToolbar token={token} />
      <div className="py-6 print:py-0">
        <div className="mx-auto max-w-[210mm] shadow-sm print:shadow-none">
          <ApplicationPrintSheet view={view} printedOn={new Date()} />
        </div>
      </div>
    </div>
  );
}
