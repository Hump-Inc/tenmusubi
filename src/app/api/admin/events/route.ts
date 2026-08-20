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

    const events = await prisma.event.findMany({
      where: status ? { status } : {},
      include: {
        organizer: { select: { id: true, orgName: true, status: true } },
        applications: {
          select: { status: true, lastMessageAt: true, organizerLastReadAt: true },
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
        slots: e.slots,
        status: e.status,
        createdAt: e.createdAt,
        organizer: e.organizer,
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
    };

    return NextResponse.json({ events: rows, stats });
  } catch (error) {
    console.error("Admin events GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
