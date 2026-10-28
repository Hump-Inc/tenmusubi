import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPrivateFile } from "@/lib/storage";

/**
 * 本人確認の書類を配信する。管理者のみ。
 *
 * 身分証などを含むため公開URLを持たせず、ここを通してだけ見せる。
 * 旧形式（公開バケットのURL）の申請は scripts/migrate-verification-docs.ts で移すまで
 * そのURLへ転送する。
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const adminCheck = await requireAdmin(session.user.id);
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { id } = await params;
  const req = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!req) {
    return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  }

  if (!req.documentKey) {
    if (req.documentUrl) return NextResponse.redirect(req.documentUrl);
    return NextResponse.json({ error: "書類がありません" }, { status: 404 });
  }

  const file = await getPrivateFile(req.documentKey);
  if (!file) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }
  return new NextResponse(Buffer.from(file.body), {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
