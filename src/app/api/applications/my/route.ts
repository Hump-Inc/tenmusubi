import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 自分の店舗が出した応募の一覧
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const applications = await prisma.eventApplication.findMany({
      where: { store: { ownerId: session.user.id } },
      include: {
        store: { select: { id: true, name: true } },
        event: {
          select: {
            id: true,
            title: true,
            venueName: true,
            area: true,
            startAt: true,
            endAt: true,
            exhibitFee: true,
            exhibitFeeMax: true,
            status: true,
            organizer: { select: { orgName: true } },
          },
        },
        _count: { select: { disclosures: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("My applications GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
