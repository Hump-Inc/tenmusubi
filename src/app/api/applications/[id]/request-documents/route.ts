import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";
import { createNotification } from "@/lib/notifications";

/**
 * POST: 主催者から書類の開示を依頼する。
 *
 * やり取りが1往復増えるぶん止まりやすくなるので、主催者から一手で
 * 押し出せるようにしておく。開示するかどうかは出店者が決める。
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
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { application, role } = result;

    if (role !== "organizer") {
      return NextResponse.json(
        { error: "この操作は主催者のみ行えます" },
        { status: 403 }
      );
    }
    if (application.status !== "open") {
      return NextResponse.json(
        { error: "このやり取りは終了しています" },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.eventApplication.update({
      where: { id },
      data: { documentRequestedAt: now, lastMessageAt: now, organizerLastReadAt: now },
    });
    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: id,
        kind: "system",
        body: "主催者が書類の開示を依頼しました",
      },
    });

    const store = await prisma.store.findUnique({
      where: { id: application.storeId },
      select: { ownerId: true },
    });
    if (store?.ownerId) {
      await createNotification({
        userId: store.ownerId,
        type: "booking",
        title: `書類の開示を依頼されました: ${application.event.title}`,
        body: "やり取りの画面から、開示する書類を選べます。",
        link: `/events/applications/${id}`,
      }).catch((e) => console.error("Document request notification error:", e));
    }

    return NextResponse.json({ requestedAt: now });
  } catch (error) {
    console.error("Request documents POST error:", error);
    return NextResponse.json({ error: "依頼に失敗しました" }, { status: 500 });
  }
}
