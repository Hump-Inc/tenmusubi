import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 出展料の請求・支払いの一覧。返金は Stripe ダッシュボードで行うので、そこへの経路も返す。
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const payments = await prisma.eventPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        application: {
          select: {
            id: true,
            store: { select: { name: true } },
            event: {
              select: { id: true, title: true, status: true, organizer: { select: { orgName: true } } },
            },
          },
        },
      },
    });

    const paid = payments.filter((p) => p.status === "paid" || p.status === "refunded");
    const stats = {
      requested: payments.filter((p) => p.status === "requested").length,
      paidCount: paid.length,
      paidTotal: paid.reduce((sum, p) => sum + p.amount - p.refundedAmount, 0),
      feeTotal: payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.platformFee, 0),
      // 中止になった募集で支払い済みのまま残っているもの。返金の判断が要る。
      needsReview: payments.filter(
        (p) => p.status === "paid" && p.application.event.status === "cancelled"
      ).length,
    };

    const testMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ?? false;

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        platformFee: p.platformFee,
        status: p.status,
        refundedAmount: p.refundedAmount,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        applicationId: p.application.id,
        storeName: p.application.store.name,
        eventTitle: p.application.event.title,
        eventCancelled: p.application.event.status === "cancelled",
        orgName: p.application.event.organizer.orgName,
        stripeUrl: p.stripePaymentIntentId
          ? `https://dashboard.stripe.com/${testMode ? "test/" : ""}payments/${p.stripePaymentIntentId}`
          : null,
      })),
      stats,
    });
  } catch (error) {
    console.error("Admin payments error:", error);
    return NextResponse.json({ error: "決済一覧の取得に失敗しました" }, { status: 500 });
  }
}
