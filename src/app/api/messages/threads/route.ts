import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 出店募集のやり取り一覧。
 *
 * 応募スレッドは募集ごとの画面の下にしか無く、主催者がログインしても
 * メッセージがどこに届いているか分からなかった（2026-08-27 MTG）。
 * 出店者としての応募も主催者として受けた応募も、立場を問わずここに集める。
 *
 * ヘッダーのバッジを1回の取得で出せるよう、DMの未読数も一緒に返す。
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    const [applications, unreadDirect] = await Promise.all([
      prisma.eventApplication.findMany({
        where: {
          OR: [{ store: { ownerId: userId } }, { event: { organizer: { userId } } }],
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              images: { where: { isDraft: false }, orderBy: { order: "asc" }, take: 1 },
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              organizer: { select: { userId: true, orgName: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true },
          },
        },
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.message.count({ where: { receiverId: userId, isRead: false } }),
    ]);

    const threads = applications.map((a) => {
      const role = a.event.organizer.userId === userId ? "organizer" : "vendor";
      const readAt = role === "organizer" ? a.organizerLastReadAt : a.vendorLastReadAt;
      return {
        id: a.id,
        role,
        kind: a.kind,
        status: a.status,
        eventId: a.event.id,
        eventTitle: a.event.title,
        eventStartAt: a.event.startAt,
        // 主催者から見れば相手は店舗、出店者から見れば相手は主催者
        counterpartName: role === "organizer" ? a.store.name : a.event.organizer.orgName,
        counterpartImage: role === "organizer" ? (a.store.images[0]?.url ?? null) : null,
        lastMessage: a.messages[0]?.body ?? null,
        lastMessageAt: a.lastMessageAt ?? a.createdAt,
        unread: !!a.lastMessageAt && (!readAt || a.lastMessageAt > readAt),
      };
    });

    return NextResponse.json({
      threads,
      unreadThreads: threads.filter((t) => t.unread).length,
      unreadDirect,
    });
  } catch (error) {
    console.error("Message threads GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
