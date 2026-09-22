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
 *
 * 主催者の口座への入金は、開催が終わってから行う（2026-09-10 MTG「Stripe 側で
 * プールして、返金やイベント終了後の入金を行う」）。主催者の Stripe アカウントの
 * 入金スケジュールを手動にしておき、runEventPayouts が開催後にまとめて入金する。
 * 開催前のキャンセルの返金は、主催者の残高から戻せる。
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

// 開催終了から何日後に入金するか。当日の不出店やトラブルの申し出を受ける猶予。
export const PAYOUT_GRACE_DAYS = 2;

// Stripe は日本では、残高を原則90日以内に入金する必要がある（手動入金でも同じ）。
// 入金が開催後になる以上、開催が遠すぎる募集の出展料は先に受け取れない。
// 余裕を見て、入金予定日が今日から85日以内の募集だけ請求できるようにする。
// 90日を超える募集の扱いは弁護士・Stripe への確認待ち。
export const MAX_DAYS_UNTIL_PAYOUT = 85;

const DAY_MS = 24 * 60 * 60 * 1000;

export function payoutDueAt(eventEndAt: Date): Date {
  return new Date(eventEndAt.getTime() + PAYOUT_GRACE_DAYS * DAY_MS);
}

/** 請求してよいか。入金予定日が遠すぎる募集は断る。 */
export function canRequestPaymentFor(eventEndAt: Date, now = new Date()): boolean {
  return payoutDueAt(eventEndAt).getTime() - now.getTime() <= MAX_DAYS_UNTIL_PAYOUT * DAY_MS;
}

/**
 * 1件の支払いのうち、主催者に入金する額。
 * 返金は Stripe 側で送金の取り消しと手数料の返還を按分するので、残った額に
 * 手数料率を当てて出す。1円の端数で残高を超えないよう切り捨てる。
 */
export function payoutAmountFor(p: { amount: number; platformFee: number; refundedAmount: number }) {
  const remaining = p.amount - p.refundedAmount;
  if (remaining <= 0 || p.amount <= 0) return 0;
  return Math.floor((remaining * (p.amount - p.platformFee)) / p.amount);
}

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
  paidOutAt: Date | null;
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
    ...(role !== "vendor" ? { paidOutAt: p.paidOutAt } : {}),
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

/**
 * 開催が終わった募集の出展料を、主催者の口座へ入金する。1日1回、cron から呼ぶ。
 *
 * 主催者ごとにまとめて1回の入金にする。残高（available）が足りなければ、その
 * 主催者は翌日に回す（カード売上が available になるまで数日かかるため）。
 */
export async function runEventPayouts(now = new Date()) {
  const due = await prisma.eventPayment.findMany({
    where: {
      status: { in: ["paid", "refunded"] },
      paidOutAt: null,
      application: {
        event: { endAt: { lte: new Date(now.getTime() - PAYOUT_GRACE_DAYS * DAY_MS) } },
      },
    },
    include: {
      application: {
        select: {
          event: {
            select: {
              title: true,
              organizer: { select: { id: true, userId: true, stripeAccountId: true } },
            },
          },
        },
      },
    },
  });

  const byOrganizer = new Map<string, typeof due>();
  for (const p of due) {
    const key = p.application.event.organizer.id;
    byOrganizer.set(key, [...(byOrganizer.get(key) ?? []), p]);
  }

  const results: { organizerId: string; amount: number; status: string }[] = [];

  for (const [organizerId, payments] of byOrganizer) {
    const organizer = payments[0].application.event.organizer;
    const amount = payments.reduce((sum, p) => sum + payoutAmountFor(p), 0);

    // 全額返金などで入金する額が無いものは、入金済みとして片付ける
    if (amount === 0) {
      await prisma.eventPayment.updateMany({
        where: { id: { in: payments.map((p) => p.id) }, paidOutAt: null },
        data: { paidOutAt: now },
      });
      results.push({ organizerId, amount: 0, status: "nothing_to_pay" });
      continue;
    }
    if (!organizer.stripeAccountId) {
      results.push({ organizerId, amount, status: "no_account" });
      continue;
    }

    try {
      const balance = await stripe.balance.retrieve({ stripeAccount: organizer.stripeAccountId });
      const available = balance.available.find((b) => b.currency === "jpy")?.amount ?? 0;
      if (available < amount) {
        results.push({ organizerId, amount, status: `waiting_balance(${available})` });
        continue;
      }

      const ids = payments.map((p) => p.id).sort();
      const payout = await stripe.payouts.create(
        {
          amount,
          currency: "jpy",
          description: "てんむすび 出展料",
          metadata: { kind: "event_payout", organizerId },
        },
        {
          stripeAccount: organizer.stripeAccountId,
          // 同じ支払いの組み合わせで二重に入金しない
          idempotencyKey: `event-payout-${ids.join("-")}`.slice(0, 255),
        }
      );

      await prisma.eventPayment.updateMany({
        where: { id: { in: ids }, paidOutAt: null },
        data: { paidOutAt: now, stripePayoutId: payout.id },
      });

      const titles = [...new Set(payments.map((p) => p.application.event.title))];
      await createNotification({
        userId: organizer.userId,
        type: "booking",
        title: `出展料 ${amount.toLocaleString("ja-JP")}円の入金手続きをしました`,
        body: `${titles.join("、")} の出展料を、登録口座へ入金します。着金まで数営業日かかります。`,
        link: "/organizer",
      }).catch((e) => console.error("Payout notification error:", e));

      results.push({ organizerId, amount, status: "paid_out" });
    } catch (error) {
      console.error(`Event payout failed for organizer ${organizerId}:`, error);
      results.push({ organizerId, amount, status: "error" });
    }
  }

  return results;
}

/** payout.failed（主催者の口座情報の誤りなど）。印を外して翌日以降にやり直させる。 */
export async function handleEventPayoutFailed(payout: Stripe.Payout) {
  if (payout.metadata?.kind !== "event_payout") return;
  const updated = await prisma.eventPayment.updateMany({
    where: { stripePayoutId: payout.id },
    data: { paidOutAt: null, stripePayoutId: null },
  });
  console.error(
    `Event payout ${payout.id} failed (${payout.failure_code ?? "unknown"}); reset ${updated.count} payments`
  );
}
