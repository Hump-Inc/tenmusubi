import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPrivateFile } from "@/lib/storage";
import { resolveShareLink } from "@/lib/shareLink";
import { shareUnlockValue, safeEqual } from "@/lib/shareToken";

/**
 * 共有リンク経由での書類配信。
 *
 * visibility が public の書類だけを返す。meta_only / private は、
 * このURLを直接叩かれても 404 にする（公開ページ側にもURLは出していない）。
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  const { token, docId } = await params;

  const { status, link } = await resolveShareLink(token);
  if (status !== "ok" || !link) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  if (link.passwordHash) {
    const cookieStore = await cookies();
    const value = cookieStore.get(`share_unlock_${link.id}`)?.value;
    if (!value || !safeEqual(value, shareUnlockValue(link.id, link.passwordHash))) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
  }

  const document = await prisma.applicationDocument.findUnique({ where: { id: docId } });
  if (!document || document.storeId !== link.storeId || document.visibility !== "public") {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  const file = await getPrivateFile(document.fileKey);
  if (!file) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(file.body), {
    headers: {
      "Content-Type": file.contentType || document.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
