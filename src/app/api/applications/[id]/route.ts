import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadApplicationForViewer, readFieldFor } from "@/lib/eventApplicationAccess";
import { parseSnapshot, checkFit } from "@/lib/eventApplicationSnapshot";

// GET: 応募1件とやり取りの内容
export async function GET(
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

    const messages = await prisma.eventApplicationMessage.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    // 開示中の書類。ファイルへの経路は返さず、配信は専用APIを通す。
    const disclosures = await prisma.eventApplicationDocument.findMany({
      where: { applicationId: id, revokedAt: null },
      include: {
        document: { select: { id: true, type: true, label: true, expiresOn: true, mimeType: true } },
      },
      orderBy: { disclosedAt: "asc" },
    });

    const snapshot = parseSnapshot(application.snapshot);
    const fit = snapshot ? checkFit(snapshot, application.event) : [];

    // 開いた時点で既読にする
    const field = readFieldFor(role);
    if (field) {
      await prisma.eventApplication
        .update({ where: { id }, data: { [field]: new Date() } })
        .catch(() => {});
    }

    return NextResponse.json({
      role,
      application: {
        id: application.id,
        kind: application.kind,
        status: application.status,
        message: application.message,
        documentRequestedAt: application.documentRequestedAt,
        confirmedAt: application.confirmedAt,
        closedAt: application.closedAt,
        createdAt: application.createdAt,
        store: {
          id: application.store.id,
          name: application.store.name,
          category: application.store.category,
        },
        event: application.event,
      },
      snapshot,
      fit,
      messages: messages.map((m) => ({
        id: m.id,
        kind: m.kind,
        body: m.body,
        createdAt: m.createdAt,
        sender: m.sender,
        // 自分の投稿かどうかは senderId で判断する
        isMine: !!m.senderId && m.senderId === session.user!.id,
      })),
      disclosures: disclosures.map((d) => ({
        id: d.id,
        disclosedAt: d.disclosedAt,
        document: d.document,
      })),
    });
  } catch (error) {
    console.error("Application GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
