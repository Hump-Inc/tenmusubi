import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadApplicationForViewer, readFieldFor } from "@/lib/eventApplicationAccess";

// POST: やり取りに投稿する
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { application, role } = result;

    if (role === "admin") {
      return NextResponse.json(
        { error: "管理者はやり取りに投稿できません" },
        { status: 403 }
      );
    }
    if (application.status === "withdrawn" || application.status === "rejected") {
      return NextResponse.json(
        { error: "このやり取りは終了しています" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 });
    }

    const message = await prisma.eventApplicationMessage.create({
      data: { applicationId: id, senderId: session.user.id, body: text.slice(0, 2000) },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    // 投稿した本人は既読にしておく。相手側の未読は据え置く。
    const field = readFieldFor(role);
    await prisma.eventApplication.update({
      where: { id },
      data: { lastMessageAt: new Date(), ...(field ? { [field]: new Date() } : {}) },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Application message POST error:", error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
