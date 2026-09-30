import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CANCEL_REASON_MAX, onEventCancelled } from "@/lib/eventCancel";

/**
 * POST: 主催者が募集を中止する。書いた理由は、やり取り中・出店決定済みの
 * 出店者全員へそのまま届く（雨天中止などを一人ずつ連絡しなくて済むように）。
 */
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
      select: { status: true, endAt: true, organizer: { select: { userId: true } } },
    });
    if (!event) {
      return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
    }
    if (event.organizer.userId !== session.user.id && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "この募集を中止する権限がありません" }, { status: 403 });
    }
    if (event.status === "cancelled") {
      return NextResponse.json({ error: "この募集はすでに中止になっています" }, { status: 400 });
    }
    if (event.endAt < new Date()) {
      return NextResponse.json({ error: "開催が終わった募集は中止できません" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, CANCEL_REASON_MAX) : "";

    // 二重に押されても知らせは1回だけにする
    const updated = await prisma.event.updateMany({
      where: { id, status: { not: "cancelled" } },
      data: { status: "cancelled" },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "この募集はすでに中止になっています" }, { status: 409 });
    }

    await onEventCancelled(id, { reason, senderId: session.user.id }).catch((e) =>
      console.error("Event cancel notify error:", e)
    );

    return NextResponse.json({ status: "cancelled" });
  } catch (error) {
    console.error("Event cancel error:", error);
    return NextResponse.json({ error: "中止に失敗しました" }, { status: 500 });
  }
}
