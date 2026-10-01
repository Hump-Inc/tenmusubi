import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";
import { documentTypeLabel } from "@/lib/constants";

// DELETE: 開示を取り消す。レコードは残し、revokedAt を立てるだけにする。
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; disclosureId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, disclosureId } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (result.role !== "vendor") {
      return NextResponse.json(
        { error: "開示を取り消せるのは出店者だけです" },
        { status: 403 }
      );
    }

    const disclosure = await prisma.eventApplicationDocument.findUnique({
      where: { id: disclosureId },
      include: { document: { select: { type: true, label: true } } },
    });
    if (!disclosure || disclosure.applicationId !== id) {
      return NextResponse.json({ error: "開示が見つかりません" }, { status: 404 });
    }
    if (disclosure.revokedAt) {
      return NextResponse.json({ message: "すでに取り消されています" });
    }

    const now = new Date();
    await prisma.eventApplicationDocument.update({
      where: { id: disclosureId },
      data: { revokedAt: now },
    });
    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: id,
        kind: "system",
        body: `出店者が書類の開示を取り消しました（${disclosure.document.label || documentTypeLabel(disclosure.document.type)}）`,
      },
    });
    await prisma.eventApplication.update({
      where: { id },
      data: { lastMessageAt: now, vendorLastReadAt: now },
    });

    return NextResponse.json({ message: "開示を取り消しました" });
  } catch (error) {
    console.error("Disclosure DELETE error:", error);
    return NextResponse.json({ error: "取り消しに失敗しました" }, { status: 500 });
  }
}
