import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SPACE_LEAD_STATUSES } from "@/lib/constants";

// GET: スペースリード一覧（管理者用）
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const leads = await prisma.spaceLead.findMany({
      where: status ? { status } : {},
      include: {
        // どの共有リンク経由か、どの出店者の紹介かが運用上いちばん重要
        shareLink: { select: { id: true, label: true, token: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: leads.length,
      ...Object.fromEntries(
        SPACE_LEAD_STATUSES.map((s) => [s.value, leads.filter((l) => l.status === s.value).length])
      ),
    };

    return NextResponse.json({ leads, stats });
  } catch (error) {
    console.error("Admin space-leads list error:", error);
    return NextResponse.json({ error: "リード一覧の取得に失敗しました" }, { status: 500 });
  }
}
