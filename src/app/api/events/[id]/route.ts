import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 募集の取得・更新・削除。
 * 下書きは主催者本人と管理者しか見られない。
 */

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}
function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function toStr(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}
function toJsonArray(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((v) => typeof v === "string");
  return items.length > 0 ? JSON.stringify(items) : null;
}

async function loadOwnEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organizer: { select: { userId: true, status: true } } },
  });
  if (!event) return { error: "募集が見つかりません", status: 404 as const };
  if (event.organizer.userId !== userId && !(await isAdmin(userId))) {
    return { error: "この募集を編集する権限がありません", status: 403 as const };
  }
  return { event };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, userId: true, orgName: true, intro: true, website: true, status: true },
        },
        images: { orderBy: { order: "asc" } },
        _count: { select: { applications: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
    }

    // 下書き・中止は関係者だけ
    if (event.status !== "published" && event.status !== "closed") {
      const session = await auth();
      const viewerId = session?.user?.id;
      const allowed =
        !!viewerId && (event.organizer.userId === viewerId || (await isAdmin(viewerId)));
      if (!allowed) {
        return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
      }
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadOwnEvent(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();

    const title = toStr(body.title, 120);
    const venueName = toStr(body.venueName, 120);
    const area = toStr(body.area, 20);
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    const exhibitFee = toInt(body.exhibitFee);

    if (!title || !venueName || !area) {
      return NextResponse.json(
        { error: "イベント名・会場・エリアを入力してください" },
        { status: 400 }
      );
    }
    if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "開催日時を入力してください" }, { status: 400 });
    }
    if (endAt < startAt) {
      return NextResponse.json(
        { error: "終了日時は開始日時より後にしてください" },
        { status: 400 }
      );
    }
    if (exhibitFee === null || exhibitFee < 0) {
      return NextResponse.json(
        { error: "出展料を入力してください（無料の場合は0）" },
        { status: 400 }
      );
    }

    const nextStatus = ["draft", "published", "closed", "cancelled"].includes(body.status)
      ? body.status
      : result.event.status;

    // 承認前の主催者は公開できない
    if (nextStatus === "published" && result.event.organizer.status !== "approved") {
      return NextResponse.json(
        { error: "主催者の承認後に公開できます" },
        { status: 403 }
      );
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        description: toStr(body.description, 5000),
        venueName,
        address: toStr(body.address, 200),
        area,
        startAt,
        endAt,
        applicationOpenAt: body.applicationOpenAt ? new Date(body.applicationOpenAt) : null,
        applicationCloseAt: body.applicationCloseAt ? new Date(body.applicationCloseAt) : null,
        slots: toInt(body.slots),
        exhibitFee,
        feeNote: toStr(body.feeNote, 200),
        spaceWidthM: toFloat(body.spaceWidthM),
        spaceDepthM: toFloat(body.spaceDepthM),
        powerAvailable: body.powerAvailable === true,
        powerWatt: toInt(body.powerWatt),
        waterAvailable: body.waterAvailable === true,
        fireAllowed: body.fireAllowed === true,
        categories: toJsonArray(body.categories),
        requiredDocuments: toJsonArray(body.requiredDocuments),
        expectedVisitors: toInt(body.expectedVisitors),
        note: toStr(body.note, 2000),
        status: nextStatus,
        publishedAt:
          nextStatus === "published" && !result.event.publishedAt
            ? new Date()
            : result.event.publishedAt,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event PUT error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

// DELETE: 応募が付いている募集は消さない。中止扱いにして履歴を残す。
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadOwnEvent(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const applications = await prisma.eventApplication.count({ where: { eventId: id } });
    if (applications > 0) {
      await prisma.event.update({ where: { id }, data: { status: "cancelled" } });
      return NextResponse.json({ message: "募集を中止しました", cancelled: true });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ message: "募集を削除しました" });
  } catch (error) {
    console.error("Event DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
