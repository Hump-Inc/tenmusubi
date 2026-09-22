import type Stripe from "stripe";
import { prisma } from "./prisma";
import { stripe } from "./stripe";
import { createNotification } from "./notifications";

/**
 * 出展料のオンライン決済。
 *
 * お金の流れ: 出店者 → (Stripe) → 主催者の Connect アカウント。運営の手数料は
 * application_fee_amount として送金時に差し引く（destination charge）。
 * on_behalf_of に主催者を指定し、出展料の売り手は主催者として扱う。
 *
 * 状態の確定は必ず Webhook で行う。支払い画面から戻ってきたことは「払った」の
 * 根拠にならない（戻るボタンや通信断で簡単に食い違う）。
 */

// 運営の手数料率（%）。未決定のため仮置き。Stripe の決済手数料（国内カード 3.6%）は
// destination charge では運営の残高から引かれるので、これを下回ると運営が赤字になる。
const DEFAULT_FEE_PERCENT = 5;

export function platformFeePercent(): number {
  const v = Number(process.env.EVENT_PAYMENT_FEE_PERCENT);
  return Number.isFinite(v) && v >= 0 && v < 100 ? v : DEFAULT_FEE_PERCENT;
}

export function calcPlatformFee(amount: number): number {
  // 端数は主催者に有利な方へ切り捨てる
  return Math.floor((amount * platformFeePercent()) / 100);
}

// Stripe の円建ての下限は50円。上限は入力ミス（桁の打ち間違い）を止めるための値。
export const MIN_PAYMENT_AMOUNT = 50;
export const MAX_PAYMENT_AMOUNT = 1_000_000;

export type EventPaymentStatus = "requested" | "paid" | "canceled" | "refunded";

export function paymentView(p: {
  id: string;
  description: string;
  amount: number;
  platformFee: number;
  status: string;
  refundedAmount: number;
  paidAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
}, role: "vendor" | "organizer" | "admin") {
  return {
    id: p.id,
    description: p.description,
    amount: p.amount,
    // 手数料と入金額は主催者と運営にだけ見せる。出店者が払うのは amount だけ。
    ...(role !== "vendor" ? { platformFee: p.platformFee, payout: p.amount - p.platformFee } : {}),
    status: p.status,
    refundedAmount: p.refundedAmount,
    paidAt: p.paidAt,
    canceledAt: p.canceledAt,
    createdAt: p.createdAt,
  };
}

/** Stripe 側の最新状態を主催者の行に写す。Webhook と、登録画面から戻った時の両方から呼ぶ。 */
export async function syncOrganizerAccount(account: Stripe.Account) {
  await prisma.organizerProfile.updateMany({
    where: { stripeAccountId: account.id },
    data: {
      stripeChargesEnabled: account.charges_enabled === true,
      stripePayoutsEnabled: account.payouts_enabled === true,
    },
  });
}

async function notifyThread(
  applicationId: string,
  body: string,
  notify: { userId: string | null | undefined; title: string }[]
) {
  const now = new Date();
  await prisma.eventApplicationMessage.create({
    data: { applicationId, kind: "system", body },
  });
  await prisma.eventApplication.update({
    where: { id: applicationId },
    data: { lastMessageAt: now },
  });
  for (const n of notify) {
    if (!n.userId) continue;
    await createNotification({
      userId: n.userId,
      type: "booking",
      title: n.title,
      body,
      link: `/events/applications/${applicationId}`,
    }).catch((e) => console.error("Event payment notification error:", e));
  }
}

async function loadParties(paymentId: string) {
  return prisma.eventPayment.findUnique({
    where: { id: paymentId },
    include: {
      application: {
        select: {
          id: true,
          store: { select: { name: true, ownerId: true } },
          event: { select: { title: true, organizer: { select: { userId: true } } } },
        },
      },
    },
  });
}

/** checkout.session.completed（mode=payment, metadata.kind=event_payment） */
export async function handleEventCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;
  // カードは完了時点で paid。コンビニ払いなどを足したら async_payment_succeeded を待つこと。
  if (session.payment_status !== "paid") return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  // requested → paid の遷移に成功した1回だけ後続処理をする。Webhook は再送されるので、
  // ここで条件付き更新にしておかないと通知が二重に飛ぶ。
  const updated = await prisma.eventPayment.updateMany({
    where: { id: paymentId, status: "requested" },
    data: {
      status: "paid",
      paidAt: new Date(),
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId ?? null,
    },
  });

  if (updated.count === 0) {
    const current = await prisma.eventPayment.findUnique({ where: { id: paymentId } });
    if (!current) return;
    // 同じセッションの再送なら何もしない
    if (current.status !== "canceled" && current.stripePaymentIntentId === paymentIntentId) return;
    // 取り消し済み、または別のセッションで払い済みの請求に支払いが来た。
    // 二重取りになるので全額戻す。
    if (paymentIntentId) {
      console.error(
        `Event payment ${paymentId}: unexpected payment in session ${session.id} (status=${current.status}). Refunding.`
      );
      await stripe.refunds.create(
        { payment_intent: paymentIntentId, reverse_transfer: true, refund_application_fee: true },
        { idempotencyKey: `event-payment-dup-${session.id}` }
      );
    }
    return;
  }

  const p = await loadParties(paymentId);
  if (!p) return;
  const yen = p.amount.toLocaleString("ja-JP");
  await notifyThread(p.applicationId, `「${p.description}」${yen}円の支払いが完了しました。`, [
    { userId: p.application.event.organizer.userId, title: `出展料が支払われました: ${p.application.store.name}` },
    { userId: p.application.store.ownerId, title: `お支払いが完了しました: ${p.application.event.title}` },
  ]);
}

/** charge.refunded。返金は当面 Stripe ダッシュボードから運営が行い、ここで状態を写す。 */
export async function handleEventChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const payment = await prisma.eventPayment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (!payment || payment.refundedAmount === charge.amount_refunded) return;

  const fullyRefunded = charge.amount_refunded >= payment.amount;
  await prisma.eventPayment.update({
    where: { id: payment.id },
    data: {
      refundedAmount: charge.amount_refunded,
      status: fullyRefunded ? "refunded" : payment.status,
    },
  });

  const p = await loadParties(payment.id);
  if (!p) return;
  const yen = charge.amount_refunded.toLocaleString("ja-JP");
  await notifyThread(
    p.applicationId,
    fullyRefunded
      ? `「${p.description}」は全額（${yen}円）返金されました。`
      : `「${p.description}」のうち${yen}円が返金されました。`,
    [
      { userId: p.application.event.organizer.userId, title: `出展料を返金しました: ${p.application.store.name}` },
      { userId: p.application.store.ownerId, title: `出展料が返金されました: ${p.application.event.title}` },
    ]
  );
}
