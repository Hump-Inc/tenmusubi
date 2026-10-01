import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * フォロー中の主催者。
 *
 * 主催者の単独ページは作っていないので、募集中のものがあればその募集へ案内し、
 * 無ければ「現在募集中の募集はありません」と出すための情報だけを返す
 * （2026-08-27 決定）。
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const follows = await prisma.organizerFollow.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        organizerId: true,
        organizer: {
          select: {
            id: true,
            orgName: true,
            events: {
              where: { status: "published", startAt: { gte: new Date() } },
              orderBy: { startAt: "asc" },
              take: 1,
              select: { id: true, title: true, startAt: true, area: true },
            },
            _count: { select: { events: true } },
          },
        },
      },
    });

    return NextResponse.json({
      organizers: follows.map((f) => ({
        id: f.organizer.id,
        orgName: f.organizer.orgName,
        openEvent: f.organizer.events[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Following organizers GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
