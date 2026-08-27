import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";
import { createNotification } from "@/lib/notifications";

/**
 * PATCH: 成立・見送り・取り下げ。
 *
 * 成立と見送りは主催者、取り下げは出店者。
 * 見送りと取り下げでは開示中の書類をすべて失効させる。話が流れた相手に
 * 営業許可証が見え続けることがあってはならない。
 */
const ALLOWED: Record<string, { role: "vendor" | "organizer"; label: string }> = {
  confirmed: { role: "organizer", label: "出店が決定しました" },
  rejected: { role: "organizer", label: "主催者が見送りとしました" },
  withdrawn: { role: "vendor", label: "出店者が応募を取り下げました" },
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { application, role } = result;

    const body = await request.json();
    const next = typeof body.status === "string" ? body.status : "";
    const rule = ALLOWED[next];

    if (!rule) {
      return NextResponse.json({ error: "指定できない状態です" }, { status: 400 });
    }
    if (role !== rule.role) {
      return NextResponse.json(
        {
          error:
            rule.role === "organizer"
              ? "この操作は主催者のみ行えます"
              : "この操作は出店者のみ行えます",
        },
        { status: 403 }
      );
    }
    if (application.status !== "open") {
      return NextResponse.json(
        { error: "このやり取りはすでに終了しています" },
        { status: 400 }
      );
    }

    const now = new Date();
    const closing = next === "rejected" || next === "withdrawn";
    // 主催者から声をかけたスカウトを断るのは「取り下げ」ではなく「辞退」
    const label =
      next === "withdrawn" && application.kind === "scout"
        ? "出店者がスカウトを辞退しました"
        : rule.label;

    await prisma.eventApplication.update({
      where: { id },
      data: {
        status: next,
        confirmedAt: next === "confirmed" ? now : null,
        closedAt: closing ? now : null,
        lastMessageAt: now,
      },
    });

    // 話が流れたら開示は残さない
    if (closing) {
      await prisma.eventApplicationDocument.updateMany({
        where: { applicationId: id, revokedAt: null },
        data: { revokedAt: now },
      });
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: id,
        kind: "system",
        body: closing
          ? `${label}${note ? `（${note}）` : ""}。開示されていた書類は表示されなくなりました。`
          : label,
      },
    });

    // 相手に必ず知らせる。結果を待っている側が放置されないようにする。
    const store = await prisma.store.findUnique({
      where: { id: application.storeId },
      select: { ownerId: true, name: true },
    });
    const targetUserId =
      role === "organizer" ? store?.ownerId : application.event.organizer.userId;

    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        type: "booking",
        title:
          next === "confirmed"
            ? `出店が決定しました: ${application.event.title}`
            : next === "rejected"
              ? `見送りとなりました: ${application.event.title}`
              : application.kind === "scout"
              ? `スカウトが辞退されました: ${store?.name ?? ""}`
              : `応募が取り下げられました: ${store?.name ?? ""}`,
        body: note || label,
        link: `/events/applications/${id}`,
      }).catch((e) => console.error("Application status notification error:", e));
    }

    return NextResponse.json({ status: next });
  } catch (error) {
    console.error("Application status PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
