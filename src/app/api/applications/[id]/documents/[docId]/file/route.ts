import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateFile } from "@/lib/storage";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";

/**
 * 開示された書類の配信。
 *
 * 開示中（revokedAt が null）のものだけを返す。取り消された書類や、
 * 別の応募で開示された書類はここからは取れない。公開URLは一切発行しない。
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id, docId } = await params;
  const result = await loadApplicationForViewer(id, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const disclosure = await prisma.eventApplicationDocument.findUnique({
    where: { applicationId_documentId: { applicationId: id, documentId: docId } },
    include: { document: true },
  });

  if (!disclosure || disclosure.revokedAt) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }
  // 応募した店舗の書類であることを念のため確認する
  if (disclosure.document.storeId !== result.application.storeId) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const file = await getPrivateFile(disclosure.document.fileKey);
  if (!file) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(file.body), {
    headers: {
      "Content-Type": file.contentType || disclosure.document.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
