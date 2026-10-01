import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { formatDateShort } from "@/lib/eventFormat";
import { decisionDeadlineAt, decisionDeadlineLabel, rainPolicyLabel } from "@/lib/eventWeather";

/**
 * 中止判断の期限が近い募集の主催者へ、判断と連絡を促す。1日1回、Vercel Cron から叩かれる。
 *
 * 「主催者が当日朝まで決めない → 出店者は仕入れ済み」という揉め方を防ぐのが目的
 * （キャンセル規定の叩き台 2026-08-28 第4条・4章）。出店が決まった出店者がいる募集
 * だけが対象。1つの募集につき1回だけで、送った印は Event.weatherRemindedAt に残す。
 */

// 期限の何時間前までに知らせるか。cron は1日1回（9時）なので、期限の前日か
// 前々日の朝に1回届く幅にしてある（前日18時期限なら前々日の朝、当日7時期限なら前日の朝）。
const REMIND_WITHIN_HOURS = 36;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "権限がありません" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    // 判断期限は開催日から最大3日前なので、開催が4日以内のものだけ見れば足りる
    const horizon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const events = await prisma.event.findMany({
      where: {
        status: "published",
        weatherRemindedAt: null,
        rainPolicy: { not: null },
        startAt: { gt: now, lte: horizon },
        applications: { some: { status: "confirmed" } },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        rainPolicy: true,
        weatherDecisionDaysBefore: true,
        weatherDecisionHour: true,
        organizer: { select: { userId: true } },
        _count: { select: { applications: { where: { status: "confirmed" } } } },
      },
    });

    let sent = 0;
    for (const event of events) {
      if (event.weatherDecisionDaysBefore === null || event.weatherDecisionHour === null) continue;
      const deadline = decisionDeadlineAt(
        event.startAt,
        event.weatherDecisionDaysBefore,
        event.weatherDecisionHour
      );
      const hoursLeft = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000);
      // 期限を過ぎたもの・まだ先のものは送らない（過ぎたものは印だけ付けて片付ける）
      if (hoursLeft > REMIND_WITHIN_HOURS) continue;

      await prisma.event.update({ where: { id: event.id }, data: { weatherRemindedAt: now } });
      if (hoursLeft <= 0) continue;

      await createNotification({
        userId: event.organizer.userId,
        type: "booking",
        title: `雨天時の判断期限が近づいています: ${event.title}`,
        body: `${formatDateShort(event.startAt)}開催（${rainPolicyLabel(event.rainPolicy)}）の中止判断の期限は「${decisionDeadlineLabel(
          event.weatherDecisionDaysBefore,
          event.weatherDecisionHour
        )}」です。出店が決まっている${event._count.applications}店舗が連絡を待っています。中止する場合は、期限までに募集を中止してください（出店者へ自動で知らせます）。`,
        link: `/events/${event.id}`,
      }).catch((e) => console.error("Weather reminder error:", e));
      sent++;
    }

    return NextResponse.json({ checked: events.length, sent });
  } catch (error) {
    console.error("Weather reminder cron error:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
