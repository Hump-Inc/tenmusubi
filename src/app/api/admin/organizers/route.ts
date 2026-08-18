import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 主催者の一覧（管理者用）
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

    const organizers = await prisma.organizerProfile.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: organizers.length,
      pending: organizers.filter((o) => o.status === "pending").length,
      approved: organizers.filter((o) => o.status === "approved").length,
      rejected: organizers.filter((o) => o.status === "rejected").length,
    };

    return NextResponse.json({ organizers, stats });
  } catch (error) {
    console.error("Admin organizers list error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
