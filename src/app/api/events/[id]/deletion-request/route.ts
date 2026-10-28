import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEventDeletionRequestAdminEmail } from "@/lib/email";

/**
 * 主催者が募集の削除を運営に申請する。募集を消せるのは運営だけ。
 * 応募したお店のやり取りや支払いの記録も一緒に消えるので、主催者の判断だけでは消させない。
 */

const REASON_MAX = 1000;

async function loadOwnEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      deletionRequestedAt: true,
      organizer: { select: { userId: true, orgName: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!event) return { error: "募集が見つかりません", status: 404 as const };
  if (event.organizer.userId !== userId) {
    return { error: "この募集の主催者だけが申請できます", status: 403 as const };
  }
  return { event };
}

// POST: 削除を申請する（申請中なら理由を書き直す）
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const { id } = await params;
    const result = await loadOwnEvent(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return NextResponse.json({ error: "削除したい理由を入力してください" }, { status: 400 });
    }
    if (reason.length > REASON_MAX) {
      return NextResponse.json(
        { error: `理由は${REASON_MAX}文字以内で入力してください` },
        { status: 400 }
      );
    }

    const { event } = result;
    const updated = await prisma.event.update({
      where: { id },
      data: { deletionRequestedAt: event.deletionRequestedAt ?? new Date(), deletionRequestReason: reason },
      select: { deletionRequestedAt: true, deletionRequestReason: true },
    });

    // 書き直しのたびに運営へ送ると煩いので、最初の申請だけ知らせる
    if (!event.deletionRequestedAt) {
      await sendEventDeletionRequestAdminEmail({
        eventId: event.id,
        title: event.title,
        orgName: event.organizer.orgName,
        reason,
        applicationCount: event._count.applications,
      }).catch((e) => console.error("Event deletion request email error:", e));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Event deletion request POST error:", error);
    return NextResponse.json({ error: "申請に失敗しました" }, { status: 500 });
  }
}

// DELETE: 申請を取り下げる
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const { id } = await params;
    const result = await loadOwnEvent(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.event.update({
      where: { id },
      data: { deletionRequestedAt: null, deletionRequestReason: null },
    });
    return NextResponse.json({ message: "申請を取り下げました" });
  } catch (error) {
    console.error("Event deletion request DELETE error:", error);
    return NextResponse.json({ error: "取り下げに失敗しました" }, { status: 500 });
  }
}
