import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";
import { documentTypeLabel } from "@/lib/constants";

/**
 * POST: 出店者が書類を開示する。
 *
 * 開示できるのは応募した店舗の所有者だけ。相手ごと・書類ごとに選べて、
 * いつでも取り消せる。共有リンクの visibility とは別軸の判断で、
 * ここでは出店者がこの主催者に見せると決めたものだけを対象にする。
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

    if (role !== "vendor") {
      return NextResponse.json(
        { error: "書類を開示できるのは出店者だけです" },
        { status: 403 }
      );
    }
    if (application.status === "rejected" || application.status === "withdrawn") {
      return NextResponse.json(
        { error: "終了したやり取りでは開示できません" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const documentIds: string[] = Array.isArray(body.documentIds)
      ? body.documentIds.filter((v: unknown) => typeof v === "string")
      : [];
    if (documentIds.length === 0) {
      return NextResponse.json({ error: "開示する書類を選んでください" }, { status: 400 });
    }

    // 自分の店舗の書類だけを対象にする
    const documents = await prisma.applicationDocument.findMany({
      where: { id: { in: documentIds }, storeId: application.storeId },
      select: { id: true, type: true, label: true },
    });
    if (documents.length === 0) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }

    const now = new Date();
    for (const doc of documents) {
      // 取り消したあとの再開示にも対応する
      await prisma.eventApplicationDocument.upsert({
        where: { applicationId_documentId: { applicationId: id, documentId: doc.id } },
        create: { applicationId: id, documentId: doc.id },
        update: { revokedAt: null, disclosedAt: now },
      });
    }

    const names = documents.map((d) => d.label || documentTypeLabel(d.type)).join("、");
    await prisma.eventApplicationMessage.create({
      data: {
        applicationId: id,
        kind: "system",
        body: `出店者が書類を開示しました（${names}）`,
      },
    });
    await prisma.eventApplication.update({
      where: { id },
      data: { lastMessageAt: now, vendorLastReadAt: now },
    });

    return NextResponse.json({ disclosed: documents.length }, { status: 201 });
  } catch (error) {
    console.error("Disclosure POST error:", error);
    return NextResponse.json({ error: "開示に失敗しました" }, { status: 500 });
  }
}
