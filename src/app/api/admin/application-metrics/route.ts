import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 出店申込パックの計測。
 *
 * この機能のKPIは登録者数ではない。ツールが実際に使われているか（発行数）、
 * 主催者に届いているか（閲覧数）、オーナー獲得ループが回っているか（リード数）を見る。
 */

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const [links, views, leads] = await Promise.all([
      prisma.shareLink.findMany({
        select: {
          createdAt: true,
          storeId: true,
          store: { select: { name: true } },
        },
      }),
      // ShareLinkView は記録時点で重複排除済み
      prisma.shareLinkView.findMany({ select: { createdAt: true, kind: true } }),
      prisma.spaceLead.findMany({ select: { createdAt: true, status: true } }),
    ]);

    const months = lastMonths(12);
    const empty = () => Object.fromEntries(months.map((m) => [m, 0]));

    const issued = empty();
    const pageViews = empty();
    const printViews = empty();
    const leadCounts = empty();

    for (const link of links) {
      const key = monthKey(link.createdAt);
      if (key in issued) issued[key]++;
    }
    for (const view of views) {
      const key = monthKey(view.createdAt);
      const target = view.kind === "print" ? printViews : pageViews;
      if (key in target) target[key]++;
    }
    for (const lead of leads) {
      const key = monthKey(lead.createdAt);
      if (key in leadCounts) leadCounts[key]++;
    }

    const monthly = months.map((month) => {
      const v = pageViews[month];
      const l = leadCounts[month];
      return {
        month,
        issued: issued[month],
        views: v,
        prints: printViews[month],
        leads: l,
        // リンク→リード転換率。公開ページ設計の良否を見る指標。
        conversionRate: v > 0 ? Math.round((l / v) * 1000) / 10 : null,
      };
    });

    // 出店者別の発行数（誰が実際に使っているか）
    const byStoreMap = new Map<string, { storeId: string; name: string; count: number }>();
    for (const link of links) {
      const entry = byStoreMap.get(link.storeId) ?? {
        storeId: link.storeId,
        name: link.store?.name ?? "（削除済み）",
        count: 0,
      };
      entry.count++;
      byStoreMap.set(link.storeId, entry);
    }
    const byStore = [...byStoreMap.values()].sort((a, b) => b.count - a.count).slice(0, 20);

    const totalViews = views.filter((v) => v.kind !== "print").length;

    return NextResponse.json({
      monthly,
      byStore,
      totals: {
        issued: links.length,
        views: totalViews,
        prints: views.filter((v) => v.kind === "print").length,
        leads: leads.length,
        registeredLeads: leads.filter((l) => l.status === "registered").length,
        conversionRate:
          totalViews > 0 ? Math.round((leads.length / totalViews) * 1000) / 10 : null,
        vendorsUsing: byStoreMap.size,
      },
    });
  } catch (error) {
    console.error("Application metrics error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
