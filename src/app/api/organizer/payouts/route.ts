import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { platformFeePercent, syncOrganizerAccount } from "@/lib/eventPayments";

/**
 * 出展料の受け取り口座（Stripe Connect Express）。
 *
 * 口座情報や本人確認書類はこちらで一切預からない。Stripe の登録画面へ送り出し、
 * 結果（決済を受けられるか・入金できるか）だけを持つ。
 */

const BASE_URL = process.env.AUTH_URL || "http://localhost:3000";

async function loadOrganizer(userId: string) {
  return prisma.organizerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      user: { select: { email: true } },
    },
  });
}

// GET: 受け取りの状態。登録画面から戻ってきた直後に呼ばれるので、毎回 Stripe から取り直す。
export async function GET() {
  try {
    if (!EVENT_PAYMENTS_ENABLED) {
      return NextResponse.json({ enabled: false });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const organizer = await loadOrganizer(session.user.id);
    if (!organizer) {
      return NextResponse.json({ error: "主催者の登録がありません" }, { status: 404 });
    }

    let chargesEnabled = organizer.stripeChargesEnabled;
    let payoutsEnabled = organizer.stripePayoutsEnabled;
    let detailsSubmitted = chargesEnabled;
    if (organizer.stripeAccountId) {
      const account = await stripe.accounts.retrieve(organizer.stripeAccountId);
      await syncOrganizerAccount(account);
      chargesEnabled = account.charges_enabled === true;
      payoutsEnabled = account.payouts_enabled === true;
      detailsSubmitted = account.details_submitted === true;
    }

    return NextResponse.json({
      enabled: true,
      state: !organizer.stripeAccountId ? "none" : chargesEnabled ? "ready" : "pending",
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      feePercent: platformFeePercent(),
    });
  } catch (error) {
    console.error("Organizer payouts GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST: 登録（または続き）を始める。Stripe の登録画面のURLを返す。
export async function POST() {
  try {
    if (!EVENT_PAYMENTS_ENABLED) {
      return NextResponse.json({ error: "現在ご利用いただけません" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const organizer = await loadOrganizer(session.user.id);
    if (!organizer) {
      return NextResponse.json({ error: "主催者の登録がありません" }, { status: 404 });
    }
    // 審査前の主催者に口座を作らせない。募集を出せない人が受け取り口座だけ持つ理由がない。
    if (organizer.status !== "approved") {
      return NextResponse.json(
        { error: "運営の承認後に設定できます" },
        { status: 403 }
      );
    }

    let accountId = organizer.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create(
        {
          type: "express",
          country: "JP",
          email: organizer.user.email ?? undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          // website は渡さない。「ウェブサイト・SNS」の自由記入欄なので @アカウント名 なども
          // 入っており、Stripe が URL として受け付けないと口座の作成ごと失敗する。
          // 登録画面で本人に入れてもらう。
          business_profile: {
            // マルシェ・イベント運営。登録画面の入力を少しでも減らす
            mcc: "7399",
          },
          metadata: { organizerId: organizer.id },
        },
        // ボタンの連打で口座が2つできないように。キーを主催者ごとに固定すると、口座を
        // 消して作り直したときに24時間は消した口座が返ってくるので、10分単位で区切る。
        { idempotencyKey: `organizer-account-${organizer.id}-${Math.floor(Date.now() / 600_000)}` }
      );
      accountId = account.id;
      await prisma.organizerProfile.update({
        where: { id: organizer.id },
        data: { stripeAccountId: accountId },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${BASE_URL}/organizer?payouts=refresh`,
      return_url: `${BASE_URL}/organizer?payouts=return`,
    });

    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Organizer payouts POST error:", error);
    return NextResponse.json({ error: "受け取り口座の設定を始められませんでした" }, { status: 500 });
  }
}
