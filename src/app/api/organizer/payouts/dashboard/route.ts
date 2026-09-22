import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import { stripe } from "@/lib/stripe";

// POST: Stripe の Express ダッシュボード（入金予定・口座の変更）へのワンタイムURL
export async function POST() {
  try {
    if (!EVENT_PAYMENTS_ENABLED) {
      return NextResponse.json({ error: "現在ご利用いただけません" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
      select: { stripeAccountId: true },
    });
    if (!organizer?.stripeAccountId) {
      return NextResponse.json({ error: "受け取り口座が設定されていません" }, { status: 400 });
    }

    const link = await stripe.accounts.createLoginLink(organizer.stripeAccountId);
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Organizer payouts dashboard error:", error);
    return NextResponse.json(
      { error: "ダッシュボードを開けませんでした。登録が済んでいるか確認してください" },
      { status: 500 }
    );
  }
}
