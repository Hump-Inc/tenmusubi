import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 主催者のフォロー。
 *
 * 募集は期間が短く、見逃すと終わりなので、気に入った主催者を登録しておけば
 * 次の募集が公開されたときに届くようにする（2026-08-27 先方フィードバック）。
 * 誰がフォローしているかは主催者に見える。出店者側の画面にもそう書いてある。
 */

async function loadOrganizer(organizerId: string) {
  return prisma.organizerProfile.findUnique({
    where: { id: organizerId },
    select: { id: true, userId: true, status: true },
  });
}

// POST: フォローする
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
    const organizer = await loadOrganizer(id);
    if (!organizer || organizer.status !== "approved") {
      return NextResponse.json({ error: "主催者が見つかりません" }, { status: 404 });
    }
    if (organizer.userId === session.user.id) {
      return NextResponse.json(
        { error: "自分自身はフォローできません" },
        { status: 400 }
      );
    }

    // 二重にフォローしても1件のままにする
    await prisma.organizerFollow.upsert({
      where: { userId_organizerId: { userId: session.user.id, organizerId: id } },
      create: { userId: session.user.id, organizerId: id },
      update: {},
    });

    const count = await prisma.organizerFollow.count({ where: { organizerId: id } });
    return NextResponse.json({ following: true, count });
  } catch (error) {
    console.error("Organizer follow POST error:", error);
    return NextResponse.json({ error: "フォローに失敗しました" }, { status: 500 });
  }
}

// DELETE: フォローをやめる
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
    await prisma.organizerFollow.deleteMany({
      where: { userId: session.user.id, organizerId: id },
    });

    const count = await prisma.organizerFollow.count({ where: { organizerId: id } });
    return NextResponse.json({ following: false, count });
  } catch (error) {
    console.error("Organizer follow DELETE error:", error);
    return NextResponse.json({ error: "解除に失敗しました" }, { status: 500 });
  }
}
