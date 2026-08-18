import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

async function loadItem(storeId: string, itemId: string, userId: string) {
  const item = await prisma.applicationMenuItem.findUnique({
    where: { id: itemId },
    include: { store: { select: { ownerId: true } } },
  });
  if (!item || item.storeId !== storeId) {
    return { error: "メニューが見つかりません", status: 404 as const };
  }
  if (item.store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "このメニューを操作する権限がありません", status: 403 as const };
  }
  return { item };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const result = await loadItem(id, itemId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const data: {
      name?: string;
      price?: number | null;
      description?: string | null;
      imageUrl?: string | null;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim().slice(0, 100);
    }
    if ("price" in body) {
      data.price =
        body.price === "" || body.price === null || !Number.isFinite(Number(body.price))
          ? null
          : Math.round(Number(body.price));
    }
    if ("description" in body) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim().slice(0, 300)
          : null;
    }
    if ("imageUrl" in body) {
      data.imageUrl = typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
    }

    const item = await prisma.applicationMenuItem.update({ where: { id: itemId }, data });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Menu PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const result = await loadItem(id, itemId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (result.item.imageUrl) {
      await deleteFile(result.item.imageUrl).catch((e) =>
        console.error("Menu image delete error:", e)
      );
    }
    await prisma.applicationMenuItem.delete({ where: { id: itemId } });

    return NextResponse.json({ message: "メニューを削除しました" });
  } catch (error) {
    console.error("Menu DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
