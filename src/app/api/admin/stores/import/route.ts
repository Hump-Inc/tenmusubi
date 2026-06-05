import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { StoreImportInput } from "@/lib/storeImport";

const MAX_ROWS = 500;

// POST: 管理者がCSVから店舗を一括作成（全て ownerId: null / isActive: false）
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
    const records: StoreImportInput[] = body?.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "登録するデータがありません" }, { status: 400 });
    }
    if (records.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `一度に登録できるのは${MAX_ROWS}件までです` },
        { status: 400 }
      );
    }

    const toInt = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    const results: { ok: boolean; name: string; id?: string; error?: string }[] = [];
    let created = 0;

    for (const rec of records) {
      const name = typeof rec?.name === "string" ? rec.name.trim() : "";
      if (!name) {
        results.push({ ok: false, name: rec?.name ?? "", error: "店舗名が空です" });
        continue;
      }
      try {
        const store = await prisma.store.create({
          data: {
            // ownerId は未割当（null）。招待リンク経由のクレームで紐付ける
            name,
            description: rec.description || null,
            category: rec.category || null,
            area: rec.area || null,
            tags: rec.tags && rec.tags.length > 0 ? JSON.stringify(rec.tags) : null,
            website: rec.website || null,
            instagram: rec.instagram || null,
            twitter: rec.twitter || null,
            ownerIntro: rec.ownerIntro || null,
            recommendedItems: rec.recommendedItems || null,
            commitment: rec.commitment || null,
            motto: rec.motto || null,
            messageToOwners: rec.messageToOwners || null,
            availableAreas:
              rec.availableAreas && rec.availableAreas.length > 0
                ? JSON.stringify(rec.availableAreas)
                : null,
            vehicleLength: toInt(rec.vehicleLength),
            vehicleWidth: toInt(rec.vehicleWidth),
            vehicleHeight: toInt(rec.vehicleHeight),
            isActive: false, // 承認まで非公開
          },
        });
        created++;
        results.push({ ok: true, name, id: store.id });
      } catch (e) {
        console.error("Store import row error:", e);
        results.push({ ok: false, name, error: "作成に失敗しました" });
      }
    }

    return NextResponse.json({
      created,
      failed: records.length - created,
      total: records.length,
      results,
    });
  } catch (error) {
    console.error("Admin store import error:", error);
    return NextResponse.json({ error: "一括登録に失敗しました" }, { status: 500 });
  }
}
