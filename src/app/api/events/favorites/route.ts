import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 「気になる」に入れた募集の一覧。
 * 締切が近い順に出す。迷ったまま期限が来るのを防ぐのがこの機能の目的なので、
 * 締切の無いものは後ろに回す。
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const favorites = await prisma.eventFavorite.findMany({
      where: { userId: session.user.id, event: { status: "published" } },
      select: {
        id: true,
        event: {
          select: {
            id: true,
            title: true,
            area: true,
            venueName: true,
            startAt: true,
            applicationCloseAt: true,
            exhibitFee: true,
            exhibitFeeMax: true,
            feeNote: true,
            images: { orderBy: { order: "asc" }, take: 1 },
          },
        },
      },
    });

    const events = favorites
      .map((f) => f.event)
      .sort((a, b) => {
        const at = a.applicationCloseAt?.getTime() ?? Infinity;
        const bt = b.applicationCloseAt?.getTime() ?? Infinity;
        return at - bt;
      });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Event favorites GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
