import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";
import { createNotification } from "@/lib/notifications";
import {
  calcPlatformFee,
  MAX_PAYMENT_AMOUNT,
  MIN_PAYMENT_AMOUNT,
  paymentView,
} from "@/lib/eventPayments";

/**
 * POST: 主催者が出展料を請求する。
 *
 * 出店が決まった応募にだけ請求できる。金額は主催者がここで決める（応募時に選んだ
 * 区画の金額を画面側で初期値にしている）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!EVENT_PAYMENTS_ENABLED) {
      return NextResponse.json({ error: "現在ご利用いただけません" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { application, role } = result;

    if (role !== "organizer") {
      return NextResponse.json({ error: "この操作は主催者のみ行えます" }, { status: 403 });
    }
    if (application.status !== "confirmed") {
      return NextResponse.json(
        { error: "出店が決定した応募にだけ請求できます" },
        { status: 400 }
      );
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { id: application.event.organizer.id },
      select: { stripeChargesEnabled: true },
    });
    if (!organizer?.stripeChargesEnabled) {
      return NextResponse.json(
        { error: "出展料の受け取り設定が完了していません。主催者情報のページから設定してください" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < MIN_PAYMENT_AMOUNT || amount > MAX_PAYMENT_AMOUNT) {
      return NextResponse.json(
        {
          error: `金額は${MIN_PAYMENT_AMOUNT}円以上${MAX_PAYMENT_AMOUNT.toLocaleString("ja-JP")}円以下の整数で入力してください`,
        },
        { status: 400 }
      );
    }
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 60)
        : "出展料";

    const payment = await prisma.eventPayment.create({
      data: {
        applicationId: id,
        description,
        amount,
        platformFee: calcPlatformFee(amount),
        requestedById: session.user.id,
      },
    });

    const yen = amount.toLocaleString("ja-JP");
    const text = `主催者から「${description}」${yen}円の請求が届きました。このページからお支払いいただけます。`;
    await prisma.eventApplicationMessage.create({
      data: { applicationId: id, kind: "system", body: text },
    });
    await prisma.eventApplication.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    const store = await prisma.store.findUnique({
      where: { id: application.storeId },
      select: { ownerId: true },
    });
    if (store?.ownerId) {
      await createNotification({
        userId: store.ownerId,
        type: "booking",
        title: `出展料の請求が届きました: ${application.event.title}`,
        body: text,
        link: `/events/applications/${id}`,
      }).catch((e) => console.error("Payment request notification error:", e));
    }

    return NextResponse.json({ payment: paymentView(payment, role) });
  } catch (error) {
    console.error("Payment request POST error:", error);
    return NextResponse.json({ error: "請求に失敗しました" }, { status: 500 });
  }
}
