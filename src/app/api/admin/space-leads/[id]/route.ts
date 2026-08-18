import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SPACE_LEAD_STATUSES } from "@/lib/constants";

const VALID_STATUSES = SPACE_LEAD_STATUSES.map((s) => s.value as string);

// PATCH: 対応ステータスの更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    const body = await request.json();

    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "ステータスの指定が不正です" }, { status: 400 });
    }

    const lead = await prisma.spaceLead.update({
      where: { id },
      data: {
        status: body.status,
        ...(typeof body.note === "string" ? { note: body.note.slice(0, 1000) } : {}),
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Admin space-lead PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
