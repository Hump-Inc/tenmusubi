import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 自分が所有する店舗一覧を取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      where: { ownerId: session.user.id },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        // 応募画面で「出店申込情報が未登録」を出すために使う
        applicationProfile: {
          select: { id: true, powerWatt: true, usesFire: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("My stores fetch error:", error);
    return NextResponse.json({ error: "店舗の取得に失敗しました" }, { status: 500 });
  }
}
