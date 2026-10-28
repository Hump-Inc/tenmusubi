import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteEvent } from "@/lib/eventDeletion";
import { createNotification } from "@/lib/notifications";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "認証が必要です", status: 401 };
  }
  const adminCheck = await requireAdmin(session.user.id);
  if ("error" in adminCheck) return adminCheck;
  return null;
}

// DELETE: 募集を削除する（運営のみ）。申請が無くても消せる。
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await checkAdmin();
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { id } = await params;
    const result = await deleteEvent(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await createNotification({
      userId: result.organizerUserId,
      type: "booking",
      title: "募集を削除しました",
      body: `「${result.title}」を運営が削除しました。`,
      link: "/organizer",
    }).catch((e) => console.error("Event deletion notify error:", e));

    return NextResponse.json({ message: "募集を削除しました" });
  } catch (error) {
    console.error("Admin event DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}

// PATCH: 削除の申請を見送る（申請を戻し、主催者に知らせる）
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await checkAdmin();
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.action !== "dismissDeletionRequest") {
      return NextResponse.json({ error: "不正な操作です" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: { title: true, deletionRequestedAt: true, organizer: { select: { userId: true } } },
    });
    if (!event) return NextResponse.json({ error: "募集が見つかりません" }, { status: 404 });
    if (!event.deletionRequestedAt) {
      return NextResponse.json({ error: "削除の申請はありません" }, { status: 400 });
    }

    await prisma.event.update({
      where: { id },
      data: { deletionRequestedAt: null, deletionRequestReason: null },
    });

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
    await createNotification({
      userId: event.organizer.userId,
      type: "booking",
      title: "募集の削除を見送りました",
      body: `「${event.title}」の削除の申請を見送りました。${note ? `\n${note}` : ""}`,
      link: `/events/${id}`,
    }).catch((e) => console.error("Event deletion dismiss notify error:", e));

    return NextResponse.json({ message: "申請を見送りました" });
  } catch (error) {
    console.error("Admin event PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
