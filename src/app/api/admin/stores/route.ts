import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 全店舗一覧（管理者用）
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const stores = await prisma.store.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = stores.length;
    const assigned = stores.filter((s) => s.ownerId !== null).length;
    const unassigned = total - assigned;

    return NextResponse.json({
      stores,
      stats: { total, assigned, unassigned },
    });
  } catch (error) {
    console.error("Admin stores fetch error:", error);
    return NextResponse.json({ error: "店舗一覧の取得に失敗しました" }, { status: 500 });
  }
}

// POST: 管理者が店舗作成（ownerId: null）
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const {
      name, description, category, area, tags, website, instagram, twitter,
      ownerIntro, recommendedItems, commitment, calendarImageUrl, availableAreas,
      newsText, newsImageUrl, messageToOwners, motto,
      vehicleLength, vehicleWidth, vehicleHeight,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "店舗名は必須です" }, { status: 400 });
    }

    const toInt = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const store = await prisma.store.create({
      data: {
        // ownerId は未割当（null）。招待リンク経由のクレームで紐付ける
        name: name.trim(),
        description: description || null,
        category: category || null,
        area: area || null,
        tags: tags ? JSON.stringify(tags) : null,
        website: website || null,
        instagram: instagram || null,
        twitter: twitter || null,
        ownerIntro: ownerIntro || null,
        recommendedItems: recommendedItems || null,
        commitment: commitment || null,
        calendarImageUrl: calendarImageUrl || null,
        availableAreas: availableAreas ? JSON.stringify(availableAreas) : null,
        newsText: newsText || null,
        newsImageUrl: newsImageUrl || null,
        messageToOwners: messageToOwners || null,
        motto: motto || null,
        vehicleLength: toInt(vehicleLength),
        vehicleWidth: toInt(vehicleWidth),
        vehicleHeight: toInt(vehicleHeight),
        isActive: false, // 承認まで非公開
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Admin store create error:", error);
    return NextResponse.json({ error: "店舗の作成に失敗しました" }, { status: 500 });
  }
}
