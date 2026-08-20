import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildApplicationSnapshot,
  parseSnapshot,
  checkFit,
} from "@/lib/eventApplicationSnapshot";
import { isAcceptingApplications } from "@/lib/eventFormat";
import { createNotification } from "@/lib/notifications";

/**
 * GET: 主催者が応募を比較するための一覧。
 *
 * 主催者は書類を見ないまま話を始めるかを決めるので、車両サイズ・必要電源・
 * 火気・必要スペース・提供食数を並べて比べられることがこの画面の役割になる。
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: { select: { userId: true, orgName: true } } },
    });
    if (!event) {
      return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
    }
    if (event.organizer.userId !== session.user.id && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const applications = await prisma.eventApplication.findMany({
      where: { eventId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            category: true,
            images: { where: { isDraft: false }, orderBy: { order: "asc" }, take: 1 },
          },
        },
        _count: { select: { disclosures: true, messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = applications.map((a) => {
      const snapshot = parseSnapshot(a.snapshot);
      return {
        id: a.id,
        kind: a.kind,
        status: a.status,
        message: a.message,
        createdAt: a.createdAt,
        lastMessageAt: a.lastMessageAt,
        // 主催者が最後に読んだ時刻より新しい投稿があれば未読
        hasUnread:
          !!a.lastMessageAt &&
          (!a.organizerLastReadAt || a.lastMessageAt > a.organizerLastReadAt),
        documentRequestedAt: a.documentRequestedAt,
        disclosureCount: a._count.disclosures,
        messageCount: a._count.messages,
        store: a.store,
        snapshot,
        fit: snapshot ? checkFit(snapshot, event) : [],
      };
    });

    const stats = {
      total: rows.length,
      open: rows.filter((r) => r.status === "open").length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      slots: event.slots,
    };

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        startAt: event.startAt,
        slots: event.slots,
        powerAvailable: event.powerAvailable,
        powerWatt: event.powerWatt,
        fireAllowed: event.fireAllowed,
        spaceWidthM: event.spaceWidthM,
        spaceDepthM: event.spaceDepthM,
      },
      applications: rows,
      stats,
    });
  } catch (error) {
    console.error("Event applications GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

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

    // 応募が放置されると、この機能そのものが死ぬので必ず知らせる
    await createNotification({
      userId: event.organizer.userId,
      type: "booking",
      title: `新しい応募が届きました: ${event.title}`,
      body: `${store.name} が応募しました。条件を確認して返信してください。`,
      link: `/events/applications/${application.id}`,
    }).catch((e) => console.error("Application notification error:", e));

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("Event application POST error:", error);
    return NextResponse.json({ error: "応募に失敗しました" }, { status: 500 });
  }
}
