import { prisma } from "./prisma";

// 主催者都合の取り消しを数える期間。昔の1回がいつまでも残ると、まじめな主催者に
// 不利になるため区切る（2026-10-22 先方と合意）
export const ORGANIZER_CANCEL_WINDOW_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 募集ページの「主催者」欄に出す実績。出店者が応募する前に、主催者が取り消しを
 * 繰り返していないかを判断できるようにする（キャンセル規定 第3条）。
 *
 * - 開催: 終わった募集の数（中止したものは除く）
 * - 主催者都合の取り消し: 直近の期間に、出店が決まった出店者を主催者の都合で取り消した回数。
 *   出店者ごとの取り消しは1人1回、募集ごとの中止は出店者が何人いても1回と数える。
 *   天候などによる中止は数えない
 */
export async function getOrganizerRecord(organizerId: string, now = new Date()) {
  const since = new Date(now.getTime() - ORGANIZER_CANCEL_WINDOW_DAYS * DAY_MS);

  const [held, cancelledVendors, cancelledEvents] = await Promise.all([
    prisma.event.count({
      where: { organizerId, status: { in: ["published", "closed"] }, endAt: { lt: now } },
    }),
    prisma.eventCancellation.count({
      where: {
        kind: "organizer",
        status: "confirmed",
        confirmedAt: { gte: since },
        application: { event: { organizerId } },
      },
    }),
    // 出店が決まった出店者がいた募集だけ。応募が集まる前に取り下げた募集は、
    // 誰にも迷惑をかけていないので数えない
    prisma.event.count({
      where: {
        organizerId,
        status: "cancelled",
        cancelCause: "organizer",
        cancelledAt: { gte: since },
        applications: { some: { status: "confirmed" } },
      },
    }),
  ]);

  return { held, organizerCancels: cancelledVendors + cancelledEvents };
}
