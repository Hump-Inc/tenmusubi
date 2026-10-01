import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 主催者プロフィールの取得と申請。
 *
 * 申請しただけでは募集を公開できない。運営が承認して初めて公開できる。
 * 架空のイベントで出店者を集める事故を、件数が少ないうちは人が見て防ぐ。
 */

function str(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        orgName: true,
        contactName: true,
        phone: true,
        website: true,
        intro: true,
        status: true,
        note: true,
        reviewedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ organizer });
  } catch (error) {
    console.error("Organizer GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// PUT: 申請の作成・更新
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const orgName = str(body.orgName, 100);
    if (!orgName) {
      return NextResponse.json({ error: "団体名・主催者名を入力してください" }, { status: 400 });
    }

    const data = {
      orgName,
      contactName: str(body.contactName, 60),
      phone: str(body.phone, 40),
      website: str(body.website, 300),
      intro: str(body.intro, 2000),
    };

    const existing = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    });

    // 却下された申請を直して出し直す場合は、審査待ちに戻す。
    // 承認済みの主催者が情報を直しただけで審査待ちに戻ることはない。
    const nextStatus =
      existing?.status === "approved" ? "approved" : ("pending" as const);

    const organizer = await prisma.organizerProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: {
        ...data,
        status: nextStatus,
        ...(existing?.status === "rejected" ? { note: null, reviewedAt: null, reviewedBy: null } : {}),
      },
      select: { id: true, orgName: true, status: true },
    });

    return NextResponse.json({ organizer });
  } catch (error) {
    console.error("Organizer PUT error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
