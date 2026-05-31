import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 出店者（店舗）一覧を取得
// 店舗ベースで検索し、結果を返す
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const area = searchParams.get("area");
    const excludeAreas = searchParams.get("excludeAreas");
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const featured = searchParams.get("featured") === "true";
    const sort = searchParams.get("sort") || "newest";

    // Search stores（公開中の店舗を表示。オーナー未割当でも管理者が公開していれば掲載する）
    const storeWhere: Record<string, unknown> = {
      isActive: true,
    };

    if (category) {
      storeWhere.category = { contains: category };
    }

    if (area) {
      storeWhere.area = { contains: area };
    } else if (excludeAreas) {
      const excluded = excludeAreas.split(",");
      storeWhere.AND = excluded.map((a) => ({
        NOT: { area: { contains: a } },
      }));
    }

    if (query) {
      storeWhere.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { tags: { contains: query } },
      ];
    }

    // featured: 画像ありの店舗を優先
    if (featured) {
      storeWhere.images = { some: {} };
    }

    // Sort order
    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where: storeWhere,
        include: {
          owner: { select: { id: true, name: true, image: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.store.count({ where: storeWhere }),
    ]);

    // Transform to vendor-like format for backwards compatibility
    const vendors = stores.map((store) => ({
      id: store.id,
      userId: store.ownerId,
      displayName: store.name,
      description: store.description,
      category: store.category,
      area: store.area,
      tags: store.tags,
      isVerified: false, // TODO: Add verification to stores or check owner
      images: store.images,
      user: store.owner,
      averageRating: 0, // TODO: Add reviews to stores
      reviewCount: 0,
      // Include the store reference for detail links
      storeId: store.id,
    }));

    return NextResponse.json({ vendors, total, limit, offset });
  } catch (error) {
    console.error("Vendors fetch error:", error);
    return NextResponse.json({ error: "出店者の取得に失敗しました" }, { status: 500 });
  }
}
