import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 運営向けのイベント一覧。
 * 主催者が使い始めているか、応募が放置されていないかを見るための画面。
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // "deletion_requested" は状態ではなく、削除の申請が出ている募集の絞り込み
    const where =
      status === "deletion_requested"
        ? { deletionRequestedAt: { not: null } }
        : status
          ? { status }
          : {};
    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: { select: { id: true, orgName: true, status: true } },
        applications: {
          select: {
            status: true,
            lastMessageAt: true,
            organizerLastReadAt: true,
            _count: { select: { payments: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = events.map((e) => {
      const applications = e.applications;
      return {
        id: e.id,
        title: e.title,
        area: e.area,
        venueName: e.venueName,
        startAt: e.startAt,
        exhibitFee: e.exhibitFee,
        exhibitFeeMax: e.exhibitFeeMax,
        slots: e.slots,
        status: e.status,
        createdAt: e.createdAt,
        organizer: e.organizer,
        deletionRequestedAt: e.deletionRequestedAt,
        deletionRequestReason: e.deletionRequestReason,
        // 支払いの記録がある募集は削除できない（src/lib/eventDeletion.ts）
        paymentCount: applications.reduce((sum, a) => sum + a._count.payments, 0),
        applicationCount: applications.length,
        confirmedCount: applications.filter((a) => a.status === "confirmed").length,
        openCount: applications.filter((a) => a.status === "open").length,
        // 主催者が読んでいない応募の数。放置の検知に使う。
        unreadByOrganizer: applications.filter(
          (a) =>
            a.status === "open" &&
            !!a.lastMessageAt &&
            (!a.organizerLastReadAt || a.lastMessageAt > a.organizerLastReadAt)
        ).length,
      };
    });

    const stats = {
      total: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      draft: rows.filter((r) => r.status === "draft").length,
      applications: rows.reduce((sum, r) => sum + r.applicationCount, 0),
      confirmed: rows.reduce((sum, r) => sum + r.confirmedCount, 0),
      stalled: rows.filter((r) => r.unreadByOrganizer > 0).length,
      deletionRequested: rows.filter((r) => r.deletionRequestedAt).length,
    };

    return NextResponse.json({ events: rows, stats });
  } catch (error) {
    console.error("Admin events GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
