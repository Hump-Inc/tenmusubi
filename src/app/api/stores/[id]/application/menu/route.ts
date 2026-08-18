import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertEditable(storeId: string, userId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "店舗が見つかりません", status: 404 as const };
  if (store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "この店舗を編集する権限がありません", status: 403 as const };
  }
  return { store };
}

// POST: メニューを追加する
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const check = await assertEditable(id, session.user.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "メニュー名を入力してください" }, { status: 400 });
    }

    const maxOrder = await prisma.applicationMenuItem.aggregate({
      where: { storeId: id },
      _max: { order: true },
    });

    const item = await prisma.applicationMenuItem.create({
      data: {
        storeId: id,
        name: name.slice(0, 100),
        price: Number.isFinite(Number(body.price)) && body.price !== "" && body.price !== null
          ? Math.round(Number(body.price))
          : null,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim().slice(0, 300)
            : null,
        imageUrl: typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Menu POST error:", error);
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}

// PUT: 並び順をまとめて更新する
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
    const check = await assertEditable(id, session.user.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body.order)
      ? body.order.filter((v: unknown) => typeof v === "string")
      : [];

    // 自分の店舗のメニューだけを並べ替える
    const owned = await prisma.applicationMenuItem.findMany({
      where: { storeId: id, id: { in: ids } },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((o) => o.id));

    await prisma.$transaction(
      ids
        .filter((itemId) => ownedIds.has(itemId))
        .map((itemId, index) =>
          prisma.applicationMenuItem.update({
            where: { id: itemId },
            data: { order: index },
          })
        )
    );

    const items = await prisma.applicationMenuItem.findMany({
      where: { storeId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Menu reorder error:", error);
    return NextResponse.json({ error: "並べ替えに失敗しました" }, { status: 500 });
  }
}
