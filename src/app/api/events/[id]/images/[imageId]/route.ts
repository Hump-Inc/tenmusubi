import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

async function loadImage(eventId: string, imageId: string, userId: string) {
  const image = await prisma.eventImage.findUnique({
    where: { id: imageId },
    include: { event: { include: { organizer: { select: { userId: true } } } } },
  });
  if (!image || image.eventId !== eventId) {
    return { error: "写真が見つかりません", status: 404 as const };
  }
  if (image.event.organizer.userId !== userId && !(await isAdmin(userId))) {
    return { error: "この写真を操作する権限がありません", status: 403 as const };
  }
  return { image };
}

// PATCH: カバー写真にする。1枚目が公開ページの先頭とSNSカードに使われる。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, imageId } = await params;
    const result = await loadImage(id, imageId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const images = await prisma.eventImage.findMany({
      where: { eventId: id },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    const reordered = [imageId, ...images.map((i) => i.id).filter((i) => i !== imageId)];

    await prisma.$transaction(
      reordered.map((imgId, index) =>
        prisma.eventImage.update({ where: { id: imgId }, data: { order: index } })
      )
    );

    const updated = await prisma.eventImage.findMany({
      where: { eventId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ images: updated });
  } catch (error) {
    console.error("Event image PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, imageId } = await params;
    const result = await loadImage(id, imageId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await deleteFile(result.image.url).catch((e) =>
      console.error("Event image file delete error:", e)
    );
    await prisma.eventImage.delete({ where: { id: imageId } });

    return NextResponse.json({ message: "写真を削除しました" });
  } catch (error) {
    console.error("Event image DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
