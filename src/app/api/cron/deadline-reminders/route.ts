import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { formatDateShort } from "@/lib/eventFormat";

/**
 * 「気になる」に入れた募集の締切リマインド。1日1回、Vercel Cron から叩かれる。
 *
 * 応募するか迷っているうちに締切を過ぎる、という取りこぼしを防ぐのが目的なので、
 * すでに応募した人には送らない。1つの募集につき1回だけで、送った印は
 * EventFavorite.remindedAt に残す。
 */

// 締切の何日前に知らせるか。前日だと動けないことがあり、1週間前だと忘れられる。
const REMIND_DAYS_BEFORE = 3;

export async function GET(request: Request) {
  // Vercel Cron は CRON_SECRET を設定していれば Authorization ヘッダを付けてくる。
  // 設定していない環境（ローカル）では素通しになる。
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "権限がありません" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const until = new Date(now.getTime() + REMIND_DAYS_BEFORE * 24 * 60 * 60 * 1000);

    const targets = await prisma.eventFavorite.findMany({
      where: {
        remindedAt: null,
        event: {
          status: "published",
          applicationCloseAt: { gte: now, lte: until },
        },
      },
      select: {
        id: true,
        userId: true,
        event: {
          select: {
            id: true,
            title: true,
            area: true,
            venueName: true,
            applicationCloseAt: true,
          },
        },
      },
      take: 500,
    });

    let sent = 0;
    let skipped = 0;

    for (const favorite of targets) {
      // すでに応募していれば知らせる意味がない
      const applied = await prisma.eventApplication.count({
        where: {
          eventId: favorite.event.id,
          store: { ownerId: favorite.userId },
        },
      });

      // 送っても送らなくても印は付ける。次の日にまた拾わないため。
      await prisma.eventFavorite.update({
        where: { id: favorite.id },
        data: { remindedAt: new Date() },
      });

      if (applied > 0) {
        skipped++;
        continue;
      }

      const closeAt = formatDateShort(favorite.event.applicationCloseAt);
      await createNotification({
        userId: favorite.userId,
        type: "event",
        title: `まもなく締切: ${favorite.event.title}`,
        body: `気になるに入れている募集です。応募の締切は ${closeAt ?? "まもなく"}（${favorite.event.area} ・ ${favorite.event.venueName}）`,
        link: `/events/${favorite.event.id}`,
      }).catch((e) => console.error("Deadline reminder error:", e));
      sent++;
    }

    return NextResponse.json({ checked: targets.length, sent, skipped });
  } catch (error) {
    console.error("Deadline reminder cron error:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
