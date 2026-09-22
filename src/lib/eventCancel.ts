import { prisma } from "./prisma";
import { createNotification } from "./notifications";

/**
 * 募集が中止になったことを、やり取り中・出店決定済みの出店者へ知らせる。
 *
 * 雨天中止のように直前に決まることが多く、知らせが届かないと出店者は仕入れを
 * 済ませたまま会場へ向かうことになる。これまでは中止にしても誰にも届かなかった。
 * 出展料を払い済みの出店者には、返金は運営から連絡すると添える（返金は当面、
 * 運営が Stripe で行うため）。
 */
export async function notifyEventCancelled(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      applications: {
        where: { status: { in: ["open", "confirmed"] } },
        select: {
          id: true,
          status: true,
          store: { select: { ownerId: true } },
          payments: { where: { status: "paid" }, select: { id: true } },
        },
      },
    },
  });
  if (!event) return;

  const now = new Date();
  for (const app of event.applications) {
    const paid = app.payments.length > 0;
    const body = paid
      ? "主催者がこの募集を中止しました。お支払いいただいた出展料の返金については、運営からご連絡します。"
      : "主催者がこの募集を中止しました。";

    await prisma.eventApplicationMessage.create({
      data: { applicationId: app.id, kind: "system", body },
    });
    await prisma.eventApplication.update({
      where: { id: app.id },
      data: { lastMessageAt: now },
    });
    // 持ち主のいない店舗（運営が作った掲載）には届け先が無い
    if (!app.store.ownerId) continue;
    await createNotification({
      userId: app.store.ownerId,
      type: "booking",
      title: `募集が中止になりました: ${event.title}`,
      body,
      link: `/events/applications/${app.id}`,
    }).catch((e) => console.error("Event cancel notification error:", e));
  }
}
