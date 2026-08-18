import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadLink(storeId: string, linkId: string, userId: string) {
  const link = await prisma.shareLink.findUnique({
    where: { id: linkId },
    include: { store: { select: { ownerId: true } } },
  });
  if (!link || link.storeId !== storeId) {
    return { error: "共有リンクが見つかりません", status: 404 as const };
  }
  if (link.store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "この共有リンクを操作する権限がありません", status: 403 as const };
  }
  return { link };
}

// PATCH: ラベルの変更
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, linkId } = await params;
    const result = await loadLink(id, linkId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";

    await prisma.shareLink.update({
      where: { id: linkId },
      data: { label: label || null },
    });

    return NextResponse.json({ message: "更新しました" });
  } catch (error) {
    console.error("Share link PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: 失効させる。
// レコードは消さない。閲覧数とリードの紐付けは計測に必要なため。
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, linkId } = await params;
    const result = await loadLink(id, linkId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (result.link.revokedAt) {
      return NextResponse.json({ message: "すでに失効しています" });
    }

    await prisma.shareLink.update({
      where: { id: linkId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ message: "共有リンクを失効しました" });
  } catch (error) {
    console.error("Share link DELETE error:", error);
    return NextResponse.json({ error: "失効に失敗しました" }, { status: 500 });
  }
}
