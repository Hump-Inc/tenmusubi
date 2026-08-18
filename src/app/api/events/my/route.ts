import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 自分が主催している募集の一覧
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, status: true },
    });
    if (!organizer) {
      return NextResponse.json({ organizer: null, events: [] });
    }

    const events = await prisma.event.findMany({
      where: { organizerId: organizer.id },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        _count: { select: { applications: true } },
      },
      orderBy: { startAt: "desc" },
    });

    return NextResponse.json({ organizer, events });
  } catch (error) {
    console.error("My events GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
