import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: ユーザーの管理者権限を付与/剥奪
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
    const { isAdmin } = body;

    if (typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "isAdmin は真偽値で指定してください" }, { status: 400 });
    }

    // 自分自身の管理者権限は剥奪できない（ロックアウト防止）
    if (id === session.user.id && isAdmin === false) {
      return NextResponse.json(
        { error: "自分自身の管理者権限は解除できません" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isAdmin },
      select: { id: true, isAdmin: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "権限の更新に失敗しました" }, { status: 500 });
  }
}
