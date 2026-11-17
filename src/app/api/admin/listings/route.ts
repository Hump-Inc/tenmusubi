import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseListingInput } from "@/lib/eventListing";

async function adminUserId(): Promise<{ userId: string } | { error: string; status: number }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "認証が必要です", status: 401 };
  const adminCheck = await requireAdmin(session.user.id);
  if ("error" in adminCheck) return adminCheck;
  return { userId: session.user.id };
}

/**
 * 運営が載せるイベントの一覧。
 * ?scope=upcoming（既定）: 終わっていないもの / past: 終わったもの / all
 */
export async function GET(request: Request) {
  try {
    const admin = await adminUserId();
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const scope = new URL(request.url).searchParams.get("scope") ?? "upcoming";
    const now = new Date();
    const where =
      scope === "past" ? { endAt: { lt: now } } : scope === "all" ? {} : { endAt: { gte: now } };

    const listings = await prisma.eventListing.findMany({
      where,
      orderBy: { startAt: scope === "past" ? "desc" : "asc" },
      take: 500,
    });
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Admin listings GET error:", error);
    return NextResponse.json({ error: "読み込みに失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await adminUserId();
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseListingInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // 同じ日に同じ名前のものを二重に入れないように
    const duplicate = await prisma.eventListing.findFirst({
      where: { title: parsed.value.title, startAt: parsed.value.startAt },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "同じ名前・同じ開始日時のイベントがすでに載っています" },
        { status: 409 }
      );
    }

    const listing = await prisma.eventListing.create({
      data: { ...parsed.value, createdById: admin.userId },
    });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Admin listings POST error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
