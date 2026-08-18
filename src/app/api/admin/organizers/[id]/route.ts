import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const VALID_STATUSES = ["pending", "approved", "rejected"];

/**
 * 主催者の承認・却下。
 * 承認したら userType に "owner" を足す。主催者として登録していない人が
 * 申請してきた場合でも、承認した時点で募集を出せる状態にするため。
 */
function withOwner(userType: string | null): string {
  let types: string[] = [];
  try {
    const parsed = userType ? JSON.parse(userType) : [];
    if (Array.isArray(parsed)) types = parsed.filter((t) => typeof t === "string");
  } catch {
    types = [];
  }
  if (!types.includes("owner")) types.push("owner");
  return JSON.stringify(types);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    const body = await request.json();

    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "ステータスの指定が不正です" }, { status: 400 });
    }

    const target = await prisma.organizerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, userType: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "主催者が見つかりません" }, { status: 404 });
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : null;

    const organizer = await prisma.organizerProfile.update({
      where: { id },
      data: {
        status: body.status,
        note: note || null,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    });

    if (body.status === "approved") {
      await prisma.user.update({
        where: { id: target.user.id },
        data: { userType: withOwner(target.user.userType) },
      });
    }

    // 申請者は結果を待っているので必ず知らせる
    if (body.status === "approved" || body.status === "rejected") {
      await createNotification({
        userId: target.user.id,
        type: "booking",
        title:
          body.status === "approved"
            ? "主催者登録が承認されました"
            : "主催者登録が承認されませんでした",
        body:
          body.status === "approved"
            ? "イベントの出店募集を掲載できるようになりました。"
            : note || "内容をご確認のうえ、再度お手続きください。",
        link: "/organizer",
      }).catch((e) => console.error("Organizer notification error:", e));
    }

    return NextResponse.json({ organizer });
  } catch (error) {
    console.error("Admin organizer PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
