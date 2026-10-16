import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/siteUrl";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // オーナーか確認
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const userTypes: string[] = user.userType ? JSON.parse(user.userType) : [];
    if (!userTypes.includes("owner")) {
      return NextResponse.json(
        { error: "スペースオーナーのみ利用可能です" },
        { status: 403 }
      );
    }

    // 既に有効なサブスクがあれば拒否
    if (
      user.subscription &&
      user.subscription.status === "active" &&
      user.subscription.stripeCurrentPeriodEnd > new Date()
    ) {
      return NextResponse.json(
        { error: "既にプレミアムプランに加入しています" },
        { status: 400 }
      );
    }

    // Stripe顧客作成（なければ）
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Checkout Session作成
    const baseUrl = siteUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings/payment?success=true`,
      cancel_url: `${baseUrl}/settings/payment?canceled=true`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "チェックアウトセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
