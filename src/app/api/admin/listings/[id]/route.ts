import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseListingInput } from "@/lib/eventListing";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "認証が必要です", status: 401 };
  const adminCheck = await requireAdmin(session.user.id);
  if ("error" in adminCheck) return adminCheck;
  return null;
}

/**
 * 掲載の更新。送り方は2通り。
 * - action なし: 掲載内容をまるごと差し替える（編集フォーム）
 * - action: "hide" | "show" | "contacted" | "uncontacted" | "checked"
 *   一覧の操作。取り下げ・再掲載、主催者へ連絡した印、情報元を確認し直した印
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await checkAdmin();
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { id } = await params;
    const existing = await prisma.eventListing.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const now = new Date();

    if (typeof body.action === "string") {
      const contactNote =
        typeof body.contactNote === "string" ? body.contactNote.trim().slice(0, 400) || null : undefined;
      const data =
        body.action === "hide"
          ? { status: "hidden" }
          : body.action === "show"
            ? { status: "published" }
            : body.action === "contacted"
              ? { contactedAt: now, ...(contactNote !== undefined ? { contactNote } : {}) }
              : body.action === "uncontacted"
                ? { contactedAt: null }
                : body.action === "checked"
                  ? { checkedAt: now }
                  : null;
      if (!data) return NextResponse.json({ error: "操作が正しくありません" }, { status: 400 });
      const listing = await prisma.eventListing.update({ where: { id }, data });
      return NextResponse.json({ listing });
    }

    const parsed = parseListingInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const listing = await prisma.eventListing.update({ where: { id }, data: parsed.value });
    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Admin listing PATCH error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

// 入力の誤りを消すとき用。主催者から取り下げの依頼が来たときは hide を使う
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await checkAdmin();
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { id } = await params;
    await prisma.eventListing.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("Admin listing DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
