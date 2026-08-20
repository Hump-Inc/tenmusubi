import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildApplicationSnapshot } from "@/lib/eventApplicationSnapshot";
import { isAcceptingApplications } from "@/lib/eventFormat";

/**
 * 募集への応募。
 *
 * 渡るのは店舗情報と車両・設備・営業条件まで。書類は渡さない。
 * 主催者との個別のやり取りが始まり、その中で出店者が開示を決める。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const storeId = typeof body.storeId === "string" ? body.storeId : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: { select: { userId: true } } },
    });
    if (!event) {
      return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
    }

    const { accepting, reason } = isAcceptingApplications(event);
    if (!accepting) {
      return NextResponse.json(
        { error: reason ?? "現在は応募を受け付けていません" },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }
    if (store.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "この店舗で応募する権限がありません" },
        { status: 403 }
      );
    }
    if (event.organizer.userId === session.user.id) {
      return NextResponse.json(
        { error: "自分が主催する募集には応募できません" },
        { status: 400 }
      );
    }

    const existing = await prisma.eventApplication.findUnique({
      where: { eventId_storeId: { eventId, storeId } },
      select: { id: true, status: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "この募集にはすでに応募しています", applicationId: existing.id },
        { status: 409 }
      );
    }

    const snapshot = await buildApplicationSnapshot(storeId);

    const application = await prisma.eventApplication.create({
      data: {
        eventId,
        storeId,
        kind: "application",
        message: message || null,
        snapshot: snapshot ? JSON.stringify(snapshot) : null,
        lastMessageAt: new Date(),
        vendorLastReadAt: new Date(),
      },
      select: { id: true },
    });

    // やり取りの起点として、最初のひとことをスレッドにも残す
    if (message) {
      await prisma.eventApplicationMessage.create({
        data: { applicationId: application.id, senderId: session.user.id, body: message },
      });
    }
    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: application.id,
        kind: "system",
        body: `${store.name} が応募しました`,
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("Event application POST error:", error);
    return NextResponse.json({ error: "応募に失敗しました" }, { status: 500 });
  }
}
