import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 募集の「気になる」。
 *
 * 応募するか迷っているうちに締切を過ぎてしまう、という取りこぼしを防ぐためのもの。
 * 印を付けておくと、締切が近づいたときに知らせる（2026-08-28 先方要望）。
 */

// POST: 気になるに追加
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!event || event.status !== "published") {
      return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
    }

    await prisma.eventFavorite.upsert({
      where: { userId_eventId: { userId: session.user.id, eventId: id } },
      create: { userId: session.user.id, eventId: id },
      update: {},
    });

    return NextResponse.json({ favorited: true });
  } catch (error) {
    console.error("Event favorite POST error:", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

// DELETE: 気になるを外す
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.eventFavorite.deleteMany({
      where: { userId: session.user.id, eventId: id },
    });

    return NextResponse.json({ favorited: false });
  } catch (error) {
    console.error("Event favorite DELETE error:", error);
    return NextResponse.json({ error: "解除に失敗しました" }, { status: 500 });
  }
}
