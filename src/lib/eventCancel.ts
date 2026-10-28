import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { stripe } from "./stripe";
import { refundForEventCancellation } from "./eventCancellation";

export const CANCEL_REASON_MAX = 1000;

/**
 * 募集を中止にしたあとの後始末。やり取り中・出店決定済みの出店者へ知らせ、
 * まだ払われていない出店料の請求を取り消す。
 *
 * 雨天中止のように直前に決まることが多く、知らせが届かないと出店者は仕入れを
 * 済ませたまま会場へ向かうことになる。主催者が一人ずつ連絡しなくて済むよう、
 * 主催者の書いた理由（「雨のため」「延期日は〜」など）をそのまま全員に届ける。
 * 払い済みの出店料は、中止の理由（天候 / 主催者都合）に応じた割合で返金する
 * （refundForEventCancellation。全額はその場で、一部は出店者の承認を経て）。
 */
export async function onEventCancelled(
  eventId: string,
  message?: { reason: string; senderId: string },
  // 返金の割合を決める中止の理由。画面で選ばせない経路（編集・削除）は主催者都合＝全額
  cause: "weather" | "organizer" = "organizer"
) {
  // 主催者都合の取り消しの回数に数えるため、中止の理由を残す（src/lib/organizerRecord.ts）
  await prisma.event.update({
    where: { id: eventId },
    data: { cancelledAt: new Date(), cancelCause: cause },
  });

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
          payments: {
            where: { status: { in: ["paid", "requested"] } },
            select: { id: true, status: true, stripeCheckoutSessionId: true },
          },
        },
      },
    },
  });
  if (!event) return;

  const reason = message?.reason.trim() ?? "";

  const now = new Date();
  for (const app of event.applications) {
    await cancelOpenRequests(app.payments.filter((p) => p.status === "requested"), now);

    const paid = app.payments.some((p) => p.status === "paid");
    const body =
      "主催者がこの募集を中止しました。" +
      (paid
        ? cause === "weather"
          ? "天候などによる中止のため、お支払いいただいた出店料は募集ページに記載の割合で返金します。"
          : "お支払いいただいた出店料は全額返金します。"
        : "");

    await prisma.eventApplicationMessage.create({
      data: { applicationId: app.id, kind: "system", body },
    });
    // 理由は経過記録の帯には収まらないので、主催者のメッセージとして続けて載せる
    if (reason && message) {
      await prisma.eventApplicationMessage.create({
        data: { applicationId: app.id, senderId: message.senderId, body: reason },
      });
    }
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
      body: reason ? `${body}\n\n主催者からのメッセージ:\n${reason}` : body,
      link: `/events/applications/${app.id}`,
    }).catch((e) => console.error("Event cancel notification error:", e));
  }

  // 知らせを出してから返金する。返金の結果（額）は応募ごとにやり取りへ載る
  await refundForEventCancellation(eventId, cause, message?.senderId ?? null);
}

/**
 * 中止した募集の未払いの請求を取り消す。開いている支払い画面も閉じる。
 * 閉じる前に払われてしまった分は Webhook で paid になり、管理画面の
 * 「中止した募集の支払い」に出るので、そこで運営が返金する。
 */
export async function cancelOpenRequests(
  payments: { id: string; stripeCheckoutSessionId: string | null }[],
  now: Date
) {
  for (const p of payments) {
    if (p.stripeCheckoutSessionId) {
      try {
        const cs = await stripe.checkout.sessions.retrieve(p.stripeCheckoutSessionId);
        if (cs.status === "complete") continue;
        if (cs.status === "open") await stripe.checkout.sessions.expire(cs.id);
      } catch (e) {
        console.error("Expire checkout on event cancel error:", e);
        continue;
      }
    }
    await prisma.eventPayment.updateMany({
      where: { id: p.id, status: "requested" },
      data: { status: "canceled", canceledAt: now },
    });
  }
}
