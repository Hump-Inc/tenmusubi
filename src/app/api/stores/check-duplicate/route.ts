import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 店舗名から既存店舗の重複候補を返す（自己登録時のダブり検知用）
// claimable = まだオーナー未割当で引き継ぎ可能な店舗（抜き取り登録された店舗など）
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = (searchParams.get("name") || "").trim();
    if (!name) {
      return NextResponse.json({ matches: [] });
    }

    // 同名（部分一致）の店舗を検索。自分が既に所有している店舗は候補から除外。
    const stores = await prisma.store.findMany({
      where: {
        name: { contains: name },
        NOT: { ownerId: session.user.id },
      },
      select: {
        id: true,
        name: true,
        area: true,
        category: true,
        ownerId: true,
        claimStatus: true,
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
      },
      take: 10,
    });

    const matches = stores.map((s) => ({
      id: s.id,
      name: s.name,
      area: s.area,
      category: s.category,
      imageUrl: s.images[0]?.url ?? null,
      // 引き継ぎ可能 = オーナー未割当かつ承認済みでない
      claimable: !s.ownerId && s.claimStatus !== "claimed",
    }));

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Store duplicate check error:", error);
    return NextResponse.json({ error: "重複チェックに失敗しました" }, { status: 500 });
  }
}
