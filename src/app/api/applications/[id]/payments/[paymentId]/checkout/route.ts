import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";

const BASE_URL = process.env.AUTH_URL || "http://localhost:3000";

/**
 * POST: 出店者が請求を支払う。Stripe の支払い画面のURLを返す。
 *
 * 開いたままの支払い画面があればそれを返し、新しく作らない。画面を2つ開いて
 * 両方で払う、という二重払いの入口を塞ぐため（それでも起きた分は Webhook で返金する）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    if (!EVENT_PAYMENTS_ENABLED) {
      return NextResponse.json({ error: "現在ご利用いただけません" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { application, role } = result;
    if (role !== "vendor") {
      return NextResponse.json({ error: "この操作は出店者のみ行えます" }, { status: 403 });
    }
    if (application.event.status === "cancelled") {
      return NextResponse.json({ error: "この募集は中止になったため、お支払いは不要です" }, { status: 400 });
    }

    const payment = await prisma.eventPayment.findFirst({
      where: { id: paymentId, applicationId: id },
    });
    if (!payment) {
      return NextResponse.json({ error: "請求が見つかりません" }, { status: 404 });
    }
    if (payment.status !== "requested") {
      return NextResponse.json({ error: "この請求はお支払いいただけない状態です" }, { status: 400 });
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { id: application.event.organizer.id },
      select: { stripeAccountId: true, stripeChargesEnabled: true },
    });
    if (!organizer?.stripeAccountId || !organizer.stripeChargesEnabled) {
      return NextResponse.json(
        { error: "主催者の受け取り設定が確認できないため、現在お支払いいただけません。主催者にお問い合わせください" },
        { status: 400 }
      );
    }

    if (payment.stripeCheckoutSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
      if (existing.status === "open" && existing.url) {
        return NextResponse.json({ url: existing.url });
      }
      if (existing.status === "complete") {
        return NextResponse.json(
          { error: "お支払いを受け付けています。反映まで少しお待ちください" },
          { status: 409 }
        );
      }
      // expired なら作り直す
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    const metadata = { kind: "event_payment", paymentId: payment.id, applicationId: id };
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user?.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: payment.amount,
            product_data: {
              name: payment.description,
              description: `${application.event.title}（主催 ${application.event.organizer.orgName}）`,
            },
          },
        },
      ],
      payment_intent_data: {
        ...(payment.platformFee > 0 ? { application_fee_amount: payment.platformFee } : {}),
        transfer_data: { destination: organizer.stripeAccountId },
        on_behalf_of: organizer.stripeAccountId,
        description: `${payment.description} / ${application.event.title}`,
        metadata,
      },
      metadata,
      success_url: `${BASE_URL}/events/applications/${id}?payment=success`,
      cancel_url: `${BASE_URL}/events/applications/${id}?payment=canceled`,
    });

    // 取り消しと入れ違った場合は保存しない（その場合セッションは使わせない）
    const saved = await prisma.eventPayment.updateMany({
      where: { id: payment.id, status: "requested" },
      data: { stripeCheckoutSessionId: checkout.id },
    });
    if (saved.count === 0) {
      await stripe.checkout.sessions.expire(checkout.id).catch(() => {});
      return NextResponse.json({ error: "この請求はお支払いいただけない状態です" }, { status: 400 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Payment checkout error:", error);
    return NextResponse.json({ error: "支払い画面を開けませんでした" }, { status: 500 });
  }
}
