import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFit } from "@/lib/eventApplicationSnapshot";
import { createNotification } from "@/lib/notifications";

/**
 * 主催者から出店者への声かけ（スカウト）。
 *
 * 応募を待つだけでは枠が埋まらない募集があり、主催者から直接オファーを出せる
 * ようにした（2026-08-27 MTG）。作られるのは応募と同じ EventApplication で、
 * kind が "scout" になるだけ。やり取り・書類の開示・成立の流れは応募と共通にする。
 *
 * スカウトの時点では出店内容のスナップショットを作らない。何を出すか・火気を
 * 何台使うかはイベントごとに変わるので、出店者が受けると決めてから入力してもらう。
 */

async function loadEventForOrganizer(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organizer: { select: { id: true, userId: true, orgName: true } } },
  });
  if (!event) return { error: "募集が見つかりません", status: 404 as const };
  if (event.organizer.userId !== userId && !(await isAdmin(userId))) {
    return { error: "権限がありません", status: 403 as const };
  }
  return { event };
}

// GET: スカウトできる出店者の候補
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
    const result = await loadEventForOrganizer(eventId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { event } = result;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const area = searchParams.get("area");

    // 声をかける相手なので、連絡の届かない（オーナー未割当の）店舗は候補にしない
    const where: Record<string, unknown> = { isActive: true, ownerId: { not: null } };
    if (category && category !== "すべて") where.category = { contains: category };
    if (area && area !== "すべて") where.area = { contains: area };
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { tags: { contains: query } },
      ];
    }

    const [stores, existing] = await Promise.all([
      prisma.store.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true,
          area: true,
          description: true,
          ownerId: true,
          images: { where: { isDraft: false }, orderBy: { order: "asc" }, take: 1 },
          applicationProfile: {
            select: {
              powerWatt: true,
              hasGenerator: true,
              usesFire: true,
              fireType: true,
              fireApplianceCount: true,
              minSpaceWidthM: true,
              minSpaceDepthM: true,
              maxServingsPerHour: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.eventApplication.findMany({
        where: { eventId },
        select: { id: true, storeId: true, kind: true, status: true },
      }),
    ]);

    // この主催者をフォローしている人。声をかけるなら、すでに関心のある相手から。
    const followers = await prisma.organizerFollow.findMany({
      where: { organizerId: event.organizer.id },
      select: { userId: true },
    });
    const followerIds = new Set(followers.map((f) => f.userId));

    const byStore = new Map(existing.map((a) => [a.storeId, a]));

    const candidates = stores.map((s) => {
      const p = s.applicationProfile;
      const already = byStore.get(s.id);
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        area: s.area,
        description: s.description,
        image: s.images[0]?.url ?? null,
        hasApplicationProfile: !!p,
        follows: !!s.ownerId && followerIds.has(s.ownerId),
        // 登録内容での照合。主催者が声をかける前に噛み合うかを見られるようにする。
        fit: p
          ? checkFit(
              {
                powerWatt: p.powerWatt,
                hasGenerator: p.hasGenerator,
                usesFire: p.usesFire,
                minSpaceWidthM: p.minSpaceWidthM,
                minSpaceDepthM: p.minSpaceDepthM,
              },
              event
            )
          : [],
        existing: already
          ? { id: already.id, kind: already.kind, status: already.status }
          : null,
      };
    });

    // フォローしてくれている店舗を先に出す。話が早い相手から声をかけられるように。
    candidates.sort((a, b) => Number(b.follows) - Number(a.follows));

    return NextResponse.json({
      event: { id: event.id, title: event.title, slots: event.slots },
      candidates,
    });
  } catch (error) {
    console.error("Scout candidates GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST: 出店者にスカウトを送る
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
    const result = await loadEventForOrganizer(eventId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { event } = result;

    if (event.status !== "published") {
      return NextResponse.json(
        { error: "公開中の募集からのみスカウトを送れます" },
        { status: 400 }
      );
    }
    if (event.startAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "開催日を過ぎています" }, { status: 400 });
    }

    const body = await request.json();
    const storeId = typeof body.storeId === "string" ? body.storeId : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, ownerId: true, isActive: true },
    });
    if (!store || !store.isActive) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }
    if (!store.ownerId) {
      return NextResponse.json(
        { error: "この店舗にはまだ連絡先が登録されていません" },
        { status: 400 }
      );
    }
    if (store.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "自分の店舗にはスカウトを送れません" },
        { status: 400 }
      );
    }

    const existing = await prisma.eventApplication.findUnique({
      where: { eventId_storeId: { eventId, storeId } },
      select: { id: true, kind: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.kind === "scout"
              ? "この店舗にはすでにスカウトを送っています"
              : "この店舗からはすでに応募が届いています",
          applicationId: existing.id,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const application = await prisma.eventApplication.create({
      data: {
        eventId,
        storeId,
        kind: "scout",
        message: message || null,
        // 出店内容は出店者が受けると決めてから入れる
        snapshot: null,
        lastMessageAt: now,
        organizerLastReadAt: now,
      },
      select: { id: true },
    });

    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: application.id,
        kind: "system",
        body: `${event.organizer.orgName} から ${store.name} へスカウトが届きました`,
      },
    });
    if (message) {
      await prisma.eventApplicationMessage.create({
        data: { applicationId: application.id, senderId: session.user.id, body: message },
      });
    }

    await createNotification({
      userId: store.ownerId,
      type: "booking",
      title: `出店のお誘いが届きました: ${event.title}`,
      body: `${event.organizer.orgName} からのスカウトです。条件を確認して返信してください。`,
      link: `/events/applications/${application.id}`,
    }).catch((e) => console.error("Scout notification error:", e));

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("Scout POST error:", error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
