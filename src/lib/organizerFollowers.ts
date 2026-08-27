import { prisma } from "./prisma";
import { createNotification } from "./notifications";

/**
 * 募集が公開されたときに、その主催者をフォローしている出店者へ知らせる。
 *
 * 送るのは1募集につき1回だけ。下書きに戻して直してから公開し直すことがあるので、
 * Event.followersNotifiedAt を印にして二重送信を防ぐ（2026-08-27 決定）。
 *
 * 通知の作成に失敗しても募集の公開自体は成立させたいので、呼び出し側では待たずに
 * catch する。ここでも1件ずつ握りつぶす。
 */
export async function notifyFollowersOfNewEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      area: true,
      venueName: true,
      status: true,
      followersNotifiedAt: true,
      organizer: { select: { id: true, orgName: true } },
    },
  });

  if (!event || event.status !== "published" || event.followersNotifiedAt) return;

  // 先に印を付ける。通知を作っている途中でもう一度公開されても、二重には送らない。
  await prisma.event.update({
    where: { id: eventId },
    data: { followersNotifiedAt: new Date() },
  });

  const followers = await prisma.organizerFollow.findMany({
    where: { organizerId: event.organizer.id },
    select: { userId: true },
  });

  for (const follower of followers) {
    await createNotification({
      userId: follower.userId,
      type: "event",
      title: `${event.organizer.orgName} が新しい募集を公開しました`,
      body: `${event.title}（${event.area} ・ ${event.venueName}）`,
      link: `/events/${event.id}`,
    }).catch((e) => console.error("Follower notification error:", e));
  }
}
