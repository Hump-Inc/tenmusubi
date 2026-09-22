import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";

/**
 * DELETE: 主催者が未払いの請求を取り消す（金額の間違いなど）。
 *
 * 出店者が支払い画面を開いたままだと、取り消した後に払えてしまう。先に
 * Stripe 側のセッションを失効させ、失効できなかった（＝払われた）場合は取り消さない。
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, paymentId } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (result.role !== "organizer") {
      return NextResponse.json({ error: "この操作は主催者のみ行えます" }, { status: 403 });
    }

    const payment = await prisma.eventPayment.findFirst({
      where: { id: paymentId, applicationId: id },
    });
    if (!payment) {
      return NextResponse.json({ error: "請求が見つかりません" }, { status: 404 });
    }
    if (payment.status !== "requested") {
      return NextResponse.json(
        { error: "支払い済み・取り消し済みの請求は取り消せません" },
        { status: 400 }
      );
    }

    if (payment.stripeCheckoutSessionId) {
      const cs = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId);
      if (cs.status === "complete") {
        return NextResponse.json(
          { error: "すでに支払われています。反映まで少しお待ちください" },
          { status: 409 }
        );
      }
      if (cs.status === "open") {
        await stripe.checkout.sessions.expire(cs.id);
      }
    }

    const now = new Date();
    const updated = await prisma.eventPayment.updateMany({
      where: { id: paymentId, status: "requested" },
      data: { status: "canceled", canceledAt: now },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "請求の状態が変わりました。画面を更新してください" }, { status: 409 });
    }

    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: id,
        kind: "system",
        body: `主催者が「${payment.description}」${payment.amount.toLocaleString("ja-JP")}円の請求を取り消しました。`,
      },
    });
    await prisma.eventApplication.update({ where: { id }, data: { lastMessageAt: now } });

    return NextResponse.json({ status: "canceled" });
  } catch (error) {
    console.error("Payment cancel error:", error);
    return NextResponse.json({ error: "取り消しに失敗しました" }, { status: 500 });
  }
}
