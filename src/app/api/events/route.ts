import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 出店募集の一覧取得と作成。
 *
 * 公開されている募集は誰でも見られる（出店者はSNSやチラシで募集を探しているので、
 * ログインの壁を作らない）。作成できるのは運営が承認した主催者だけ。
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

// GET: 募集中のイベント一覧（公開）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area");
    const category = searchParams.get("category");
    const query = searchParams.get("q");
    const month = searchParams.get("month"); // "2026-10"
    const maxFee = searchParams.get("maxFee");
    const includeClosed = searchParams.get("includeClosed") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = { status: "published" };

    if (area && area !== "すべて") where.area = area;
    // 募集業種は JSON 配列の文字列なので、部分一致で絞る
    if (category && category !== "すべて") where.categories = { contains: category };
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { venueName: { contains: query } },
      ];
    }
    if (maxFee) {
      const fee = toInt(maxFee);
      if (fee !== null) where.exhibitFee = { lte: fee };
    }
    if (month) {
      const [y, m] = month.split("-").map(Number);
      if (y && m) {
        where.startAt = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      }
    }
    // 締切済みは既定で除外する。応募できない募集が並ぶと探しづらいため。
    // 「開催日を過ぎたもの」と「募集を締め切ったもの」の両方を落とす。
    if (!includeClosed) {
      const now = new Date();
      if (!month) where.startAt = { gte: now };
      where.AND = [
        { OR: [{ applicationCloseAt: null }, { applicationCloseAt: { gte: now } }] },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: { id: true, orgName: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
          _count: { select: { applications: true } },
        },
        orderBy: { startAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({ events, total });
  } catch (error) {
    console.error("Events GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST: 募集を作成する（承認済みの主催者のみ）
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, status: true },
    });
    if (!organizer) {
      return NextResponse.json(
        { error: "先に主催者情報を登録してください" },
        { status: 403 }
      );
    }
    if (organizer.status !== "approved") {
      return NextResponse.json(
        { error: "主催者の承認後に募集を作成できます" },
        { status: 403 }
      );
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
    // 出展料は必須。「応相談」を許さず、出店者が金額で絞り込めることを優先する。
    if (exhibitFee === null || exhibitFee < 0) {
      return NextResponse.json(
        { error: "出展料を入力してください（無料の場合は0）" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
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
        status: body.status === "published" ? "published" : "draft",
        publishedAt: body.status === "published" ? new Date() : null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Events POST error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
