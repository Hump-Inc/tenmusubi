import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import crypto from "crypto";
import { siteUrl } from "@/lib/siteUrl";

// GET: QRコード画像を返す
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

    // 店舗を取得し、オーナーであることを確認
    const store = await prisma.store.findUnique({
      where: { id },
      select: { ownerId: true, qrToken: true },
    });

    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    if (store.ownerId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // qrTokenが無ければ生成
    let qrToken = store.qrToken;
    if (!qrToken) {
      qrToken = crypto.randomUUID();
      await prisma.store.update({
        where: { id },
        data: { qrToken },
      });
    }

    const baseUrl = siteUrl("https://tenmusubi.net");
    const checkinUrl = `${baseUrl}/checkin/${id}?token=${qrToken}`;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format === "url") {
      return NextResponse.json({ url: checkinUrl, qrToken });
    }

    // QRコード画像をPNGで生成
    const qrBuffer = await QRCode.toBuffer(checkinUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("QR code generation error:", error);
    return NextResponse.json({ error: "QRコードの生成に失敗しました" }, { status: 500 });
  }
}
