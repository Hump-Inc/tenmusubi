import type { EventCancellation } from "@prisma/client";
import { prisma } from "./prisma";
import { stripe } from "./stripe";
import { createNotification } from "./notifications";
import { cancelOpenRequests, CANCEL_REASON_MAX } from "./eventCancel";
import { CANCELLATION_RESPONSE_DAYS, cancellationFeePercent } from "./cancellationPolicy";

/**
 * 出店料を払ったあとのキャンセル（キャンセル規定 第2条・第3条・第7条）。
 *
 * 出店者都合: 出店者が申し出る → 主催者が受け付ける（返金額は規定どおり以上） →
 *   出店者が承認したら返金。主催者が受け付けない・出店者が承認しないまま
 *   CANCELLATION_RESPONSE_DAYS 日たったら、その時点の額で自動で確定する（cron）。
 *   合意できなければ「合意できない」を押してもらい、運営が額を決めて確定する。
 * 主催者都合: 主催者の操作でその場で全額返金して確定する。
 *
 * 運営が追いかけなくても回るようにするのが目的。運営が出るのは合意できないときだけ。
 * 手続き中は runEventPayouts が入金を止めるので、返金のお金が先に出ていくことはない。
 */

export const ACTIVE_CANCELLATION_STATUSES = ["requested", "accepted", "disputed"] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const RESPONSE_MS = CANCELLATION_RESPONSE_DAYS * DAY_MS;

export class CancellationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function yen(n: number) {
  return `${n.toLocaleString("ja-JP")}円`;
}

type PaymentRow = {
  id: string;
  amount: number;
  refundedAmount: number;
  status: string;
  paidOutAt: Date | null;
  stripePaymentIntentId: string | null;
};

/** 払われていて、まだ返金していない額 */
function paidRemaining(payments: PaymentRow[]): number {
  return payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount - p.refundedAmount), 0);
}

async function loadContext(applicationId: string) {
  const app = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      store: { select: { name: true, ownerId: true } },
      event: {
        select: {
          title: true,
          startAt: true,
          endAt: true,
          status: true,
          organizer: { select: { userId: true } },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          refundedAmount: true,
          status: true,
          paidOutAt: true,
          stripePaymentIntentId: true,
          stripeCheckoutSessionId: true,
          paidAt: true,
        },
      },
      cancellation: true,
    },
  });
  if (!app) throw new CancellationError("応募が見つかりません", 404);
  return app;
}

type Context = Awaited<ReturnType<typeof loadContext>>;

/** 規定どおりのキャンセル料。申し出の時刻で決める */
export function policyFeeFor(
  paidAmount: number,
  ctx: { requestedAt: Date; startAt: Date; confirmedAt: Date | null }
) {
  const percent = cancellationFeePercent(ctx);
  // 端数は出店者に有利な方へ切り捨てる
  const fee = Math.floor((paidAmount * percent) / 100);
  return { percent, fee, refund: paidAmount - fee };
}

/** 新しくキャンセルを始められるか。始められないときは理由を返す */
function startableReason(ctx: Context, now: Date): string | null {
  if (ctx.cancellation) return "この出店はすでにキャンセルの手続きがあります";
  if (ctx.status !== "confirmed") return "出店が決定した応募だけキャンセルできます";
  if (ctx.event.status === "cancelled") return "募集が中止されているため、運営から返金のご連絡をします";
  if (now >= ctx.event.endAt) return "開催が終わった出店はキャンセルできません";
  if (ctx.payments.some((p) => p.status === "paid" && p.paidOutAt)) {
    return "主催者への入金が済んでいるため、運営にお問い合わせください";
  }
  if (paidRemaining(ctx.payments) <= 0) return "お支払い済みの出店料がありません";
  return null;
}

/** 画面に出す「今申し出るといくらか」。始められない応募では null */
export async function cancellationPreview(applicationId: string, now = new Date()) {
  const ctx = await loadContext(applicationId);
  if (startableReason(ctx, now)) return null;
  const paidAmount = paidRemaining(ctx.payments);
  const p = policyFeeFor(paidAmount, {
    requestedAt: now,
    startAt: ctx.event.startAt,
    confirmedAt: ctx.confirmedAt,
  });
  return { paidAmount, feePercent: p.percent, policyFee: p.fee, policyRefund: p.refund };
}

export function cancellationView(c: EventCancellation) {
  const policyRefund = c.paidAmount - c.policyFee;
  // 自動で確定する時刻。受け付け前は申し出から、受け付け後は受け付けから数える
  const autoConfirmAt =
    c.status === "requested"
      ? new Date(c.requestedAt.getTime() + RESPONSE_MS)
      : c.status === "accepted" && c.acceptedAt
        ? new Date(c.acceptedAt.getTime() + RESPONSE_MS)
        : null;
  return {
    id: c.id,
    kind: c.kind,
    status: c.status,
    requestedAt: c.requestedAt,
    paidAmount: c.paidAmount,
    policyFee: c.policyFee,
    policyRefund,
    refundAmount: c.refundAmount,
    acceptedAt: c.acceptedAt,
    disputedAt: c.disputedAt,
    confirmedAt: c.confirmedAt,
    confirmedBy: c.confirmedBy,
    autoConfirmAt,
  };
}

/** 理由の入力を整える。必須の操作で空なら投げる */
export function normalizeReason(value: unknown, required: boolean): string {
  const reason = typeof value === "string" ? value.trim().slice(0, CANCEL_REASON_MAX) : "";
  if (required && !reason) throw new CancellationError("理由を入力してください");
  return reason;
}

async function post(
  ctx: Context,
  body: string,
  notify: { userId: string | null | undefined; title: string }[],
  // 操作した人が書いた理由。経過記録の帯には収まらないので、その人のメッセージとして続けて載せる
  reason?: { text: string; senderId: string }
) {
  await prisma.eventApplicationMessage.create({
    data: { applicationId: ctx.id, kind: "system", body },
  });
  if (reason?.text) {
    await prisma.eventApplicationMessage.create({
      data: { applicationId: ctx.id, senderId: reason.senderId, body: reason.text },
    });
  }
  const notifyBody = reason?.text ? `${body}\n\n理由:\n${reason.text}` : body;
  await prisma.eventApplication.update({
    where: { id: ctx.id },
    data: { lastMessageAt: new Date() },
  });
  for (const n of notify) {
    if (!n.userId) continue;
    await createNotification({
      userId: n.userId,
      type: "booking",
      title: n.title,
      body: notifyBody,
      link: `/events/applications/${ctx.id}`,
    }).catch((e) => console.error("Cancellation notification error:", e));
  }
}

/** 出店者: キャンセルを申し出る（第7条第1項） */
export async function requestVendorCancellation(
  applicationId: string,
  userId: string,
  reasonInput?: unknown,
  now = new Date()
) {
  // 理由は任意。体調や家庭の事情など書きたくないこともあり、キャンセル料も理由で変わらない
  const reason = normalizeReason(reasonInput, false);
  const ctx = await loadContext(applicationId);
  const blocked = startableReason(ctx, now);
  if (blocked) throw new CancellationError(blocked);

  const paidAmount = paidRemaining(ctx.payments);
  const p = policyFeeFor(paidAmount, {
    requestedAt: now,
    startAt: ctx.event.startAt,
    confirmedAt: ctx.confirmedAt,
  });

  // applicationId は unique なので、連打しても2件はできない
  const c = await prisma.eventCancellation
    .create({
      data: {
        applicationId,
        kind: "vendor",
        status: "requested",
        requestedAt: now,
        requestedById: userId,
        paidAmount,
        policyFee: p.fee,
      },
    })
    .catch(() => {
      throw new CancellationError("この出店はすでにキャンセルの手続きがあります");
    });

  await post(
    ctx,
    `出店者がキャンセルを申し出ました。規定のキャンセル料は${yen(p.fee)}（${p.percent}%）、返金額は${yen(p.refund)}です。` +
      `主催者は${CANCELLATION_RESPONSE_DAYS}日以内に受け付けてください。受け付けがない場合は、この金額で確定します。`,
    [{ userId: ctx.event.organizer.userId, title: `キャンセルの申し出がありました: ${ctx.store.name}` }],
    { text: reason, senderId: userId }
  );
  return c;
}

/** 主催者: 受け付ける。返金額は規定どおり以上（第7条第2項） */
export async function acceptCancellation(applicationId: string, refundAmount: number, now = new Date()) {
  const ctx = await loadContext(applicationId);
  const c = ctx.cancellation;
  if (!c || c.kind !== "vendor" || c.status !== "requested") {
    throw new CancellationError("受け付けられる申し出がありません");
  }
  const policyRefund = c.paidAmount - c.policyFee;
  if (!Number.isInteger(refundAmount) || refundAmount < policyRefund || refundAmount > c.paidAmount) {
    throw new CancellationError(
      `返金額は${yen(policyRefund)}以上${yen(c.paidAmount)}以下で指定してください`
    );
  }

  const updated = await prisma.eventCancellation.updateMany({
    where: { id: c.id, status: "requested" },
    data: { status: "accepted", refundAmount, acceptedAt: now },
  });
  if (updated.count === 0) throw new CancellationError("申し出の状態が変わりました。画面を再読み込みしてください");

  await post(
    ctx,
    `主催者がキャンセルを受け付けました。返金額は${yen(refundAmount)}です。` +
      `出店者が承認すると返金します。${CANCELLATION_RESPONSE_DAYS}日以内に承認がない場合も、この金額で確定します。`,
    [{ userId: ctx.store.ownerId, title: `キャンセルが受け付けられました: ${ctx.event.title}` }]
  );
}

/** 出店者: 主催者の受け付けた内容を承認する（第7条第4項） */
export async function approveCancellation(applicationId: string) {
  const ctx = await loadContext(applicationId);
  const c = ctx.cancellation;
  if (!c || c.status !== "accepted" || c.refundAmount === null) {
    throw new CancellationError("承認できる内容がありません");
  }
  await confirmCancellation(ctx, c, c.refundAmount, "vendor", ["accepted"]);
}

/** 出店者・主催者: 合意できないので運営に判断を求める（第7条第6項） */
export async function disputeCancellation(
  applicationId: string,
  userId: string,
  role: "vendor" | "organizer",
  reasonInput?: unknown,
  now = new Date()
) {
  // 何に納得できないのかが無いと、運営が判断できない
  const reason = normalizeReason(reasonInput, true);
  const ctx = await loadContext(applicationId);
  const c = ctx.cancellation;
  // 出店者は受け付け前後のどちらでも、主催者は受け付ける前だけ（受け付けたあとに覆さない）
  const allowed = role === "vendor" ? ["requested", "accepted"] : ["requested"];
  if (!c || c.kind !== "vendor" || !allowed.includes(c.status)) {
    throw new CancellationError("この手続きには申し立てできません");
  }

  const updated = await prisma.eventCancellation.updateMany({
    where: { id: c.id, status: { in: allowed } },
    data: { status: "disputed", disputedAt: now, disputedById: userId },
  });
  if (updated.count === 0) throw new CancellationError("申し出の状態が変わりました。画面を再読み込みしてください");

  const who = role === "vendor" ? "出店者" : "主催者";
  await post(
    ctx,
    `${who}が「合意できない」として運営に判断を求めました。運営がやり取りの記録をもとに返金額を決めます。` +
      "それまで主催者への入金は行いません。",
    [
      role === "vendor"
        ? { userId: ctx.event.organizer.userId, title: `キャンセルの内容が運営の判断になりました: ${ctx.store.name}` }
        : { userId: ctx.store.ownerId, title: `キャンセルの内容が運営の判断になりました: ${ctx.event.title}` },
    ],
    { text: reason, senderId: userId }
  );

  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
  for (const a of admins) {
    await createNotification({
      userId: a.id,
      type: "booking",
      title: `キャンセルの判断が必要です: ${ctx.event.title} / ${ctx.store.name}`,
      body: `${who}が合意できないとして申し立てました。\n\n理由:\n${reason}`,
      link: `/events/applications/${ctx.id}`,
    }).catch((e) => console.error("Dispute admin notification error:", e));
  }
}

/** 運営: 返金額を決めて確定する（第7条第6項） */
export async function resolveCancellation(applicationId: string, refundAmount: number) {
  const ctx = await loadContext(applicationId);
  const c = ctx.cancellation;
  if (!c || c.status === "confirmed") throw new CancellationError("確定できる手続きがありません");
  if (!Number.isInteger(refundAmount) || refundAmount < 0 || refundAmount > c.paidAmount) {
    throw new CancellationError(`返金額は0円以上${yen(c.paidAmount)}以下で指定してください`);
  }
  await confirmCancellation(ctx, c, refundAmount, "admin", [...ACTIVE_CANCELLATION_STATUSES]);
}

/** 主催者: 主催者都合で取り消す。全額返金してその場で確定する（第3条） */
export async function organizerCancel(
  applicationId: string,
  userId: string,
  reasonInput?: unknown,
  now = new Date()
) {
  // 出店者は取り消された理由を知る必要がある
  const reason = normalizeReason(reasonInput, true);
  const ctx = await loadContext(applicationId);
  const blocked = startableReason(ctx, now);
  if (blocked) throw new CancellationError(blocked);

  const paidAmount = paidRemaining(ctx.payments);
  const c = await prisma.eventCancellation
    .create({
      data: {
        applicationId,
        kind: "organizer",
        status: "requested",
        requestedAt: now,
        requestedById: userId,
        paidAmount,
        policyFee: 0,
      },
    })
    .catch(() => {
      throw new CancellationError("この出店はすでにキャンセルの手続きがあります");
    });
  await confirmCancellation(ctx, c, paidAmount, "organizer", ["requested"], { text: reason, senderId: userId });
}

/**
 * 確定して返金する。返金に失敗したら状態を戻して投げる（Stripe 側は冪等キーで
 * 二重にならないので、やり直してよい）。
 */
async function confirmCancellation(
  ctx: Context,
  c: EventCancellation,
  refundAmount: number,
  by: "vendor" | "auto" | "organizer" | "admin",
  from: string[],
  reason?: { text: string; senderId: string }
) {
  const now = new Date();
  const claimed = await prisma.eventCancellation.updateMany({
    where: { id: c.id, status: { in: from } },
    data: { status: "confirmed", refundAmount, confirmedAt: now, confirmedBy: by },
  });
  if (claimed.count === 0) throw new CancellationError("申し出の状態が変わりました。画面を再読み込みしてください");

  try {
    await refundPayments(c.id, ctx.payments, refundAmount);
  } catch (e) {
    await prisma.eventCancellation.update({
      where: { id: c.id },
      data: { status: c.status, refundAmount: c.refundAmount, confirmedAt: null, confirmedBy: null },
    });
    console.error(`Cancellation ${c.id}: refund failed`, e);
    throw new CancellationError("返金の処理に失敗しました。時間をおいてやり直すか、運営にお問い合わせください", 502);
  }

  // 出店は取りやめ。未払いの請求があれば閉じ、開示していた書類も失効させる
  await cancelOpenRequests(
    ctx.payments.filter((p) => p.status === "requested"),
    now
  );
  await prisma.eventApplication.update({
    where: { id: ctx.id },
    data: { status: c.kind === "organizer" ? "rejected" : "withdrawn", closedAt: now },
  });
  await prisma.eventApplicationDocument.updateMany({
    where: { applicationId: ctx.id, revokedAt: null },
    data: { revokedAt: now },
  });

  const fee = c.paidAmount - refundAmount;
  const head =
    c.kind === "organizer"
      ? "主催者都合で出店が取り消されました。"
      : by === "auto"
        ? `期限（${CANCELLATION_RESPONSE_DAYS}日）を過ぎたため、キャンセルが確定しました。`
        : by === "admin"
          ? "運営の判断により、キャンセルが確定しました。"
          : "出店者が承認し、キャンセルが確定しました。";
  const money =
    refundAmount > 0
      ? `${yen(refundAmount)}を返金します（キャンセル料${yen(fee)}）。カードへの反映には数日〜数週間かかることがあります。`
      : `キャンセル料は${yen(fee)}で、返金はありません。`;
  await post(ctx, `${head}${money}開示されていた書類は表示されなくなりました。`, [
    { userId: ctx.store.ownerId, title: `キャンセルが確定しました: ${ctx.event.title}` },
    { userId: ctx.event.organizer.userId, title: `キャンセルが確定しました: ${ctx.store.name}` },
  ], reason);
}

/**
 * Stripe で返金する。送金の取り消しと手数料の返還も返金額に比例させる
 * （reverse_transfer / refund_application_fee）。これで主催者と運営の取り分が
 * 同じ割合で残り、第6条どおりになる（payoutAmountFor もこの按分を前提にしている）。
 */
async function refundPayments(cancellationId: string, payments: PaymentRow[], amount: number) {
  let left = amount;
  for (const p of payments.filter((x) => x.status === "paid")) {
    if (left <= 0) break;
    const remaining = p.amount - p.refundedAmount;
    if (remaining <= 0) continue;
    if (!p.stripePaymentIntentId) throw new Error(`payment ${p.id} has no payment intent`);
    const part = Math.min(remaining, left);

    await stripe.refunds.create(
      {
        payment_intent: p.stripePaymentIntentId,
        amount: part,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: { kind: "event_cancellation", cancellationId },
      },
      // 途中で失敗してやり直したときに、同じ額の同じ返金として扱われるようにする。
      // そのため返金額（refundedAmount）はここでは書き換えず、charge.refunded の
      // Webhook で写す（書き換えると、やり直しで割り振りが変わりキーと額が食い違う）
      { idempotencyKey: `event-cancellation-${cancellationId}-${p.id}` }
    );
    left -= part;
  }
  if (left > 0) throw new Error(`refund short by ${left}`);
}

/** 期限を過ぎた手続きを確定する。1日1回、入金の cron の前に呼ぶ */
export async function runCancellationAutoConfirm(now = new Date()) {
  const limit = new Date(now.getTime() - RESPONSE_MS);
  const due = await prisma.eventCancellation.findMany({
    where: {
      kind: "vendor",
      OR: [
        { status: "requested", requestedAt: { lte: limit } },
        { status: "accepted", acceptedAt: { lte: limit } },
      ],
    },
  });

  const results: { applicationId: string; status: string }[] = [];
  for (const c of due) {
    try {
      const ctx = await loadContext(c.applicationId);
      const amount = c.status === "accepted" && c.refundAmount !== null ? c.refundAmount : c.paidAmount - c.policyFee;
      await confirmCancellation(ctx, c, amount, "auto", [c.status]);
      results.push({ applicationId: c.applicationId, status: "confirmed" });
    } catch (e) {
      console.error(`Cancellation auto-confirm ${c.id} error:`, e);
      results.push({ applicationId: c.applicationId, status: "error" });
    }
  }
  return results;
}
