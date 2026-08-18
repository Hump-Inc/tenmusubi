import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateFile } from "@/lib/storage";

/**
 * 書類の実体を配信する。所有者と管理者のみ。
 *
 * 公開URLを持たせずここを通すことで、URLが漏れても第三者は取得できない。
 * 主催者向けの配信は共有トークン側の別ルートが担当する。
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
  const document = await prisma.applicationDocument.findUnique({
    where: { id: docId },
    include: { store: { select: { ownerId: true } } },
  });

  if (!document || document.storeId !== id) {
    return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
  }
  if (document.store.ownerId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const file = await getPrivateFile(document.fileKey);
  if (!file) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(file.body), {
    headers: {
      "Content-Type": file.contentType || document.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
