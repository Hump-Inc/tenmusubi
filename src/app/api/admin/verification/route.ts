import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicRequest } from "@/lib/verification";

// GET: 認証申請一覧を取得（管理者用）
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 管理者チェック
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where = status ? { status } : {};

    const requests = await prisma.verificationRequest.findMany({
      where,
      orderBy: { submittedAt: "desc" },
    });

    // Enrich with user info
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { id: true, name: true, email: true, image: true },
        });
        const profile = await prisma.profile.findUnique({
          where: { userId: req.userId },
          select: { displayName: true, category: true },
        });
        return { ...publicRequest(req), user, profile };
      })
    );

    return NextResponse.json(enrichedRequests);
  } catch (error) {
    console.error("Admin verification list error:", error);
    return NextResponse.json(
      { error: "認証申請一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: 認証申請を承認または却下
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 管理者チェック
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const { requestId, action, note } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "requestIdとactionは必須です" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "actionはapproveまたはrejectである必要があります" },
        { status: 400 }
      );
    }

    const verificationRequest = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!verificationRequest) {
      return NextResponse.json(
        { error: "認証申請が見つかりません" },
        { status: 404 }
      );
    }

    if (verificationRequest.status !== "pending") {
      return NextResponse.json(
        { error: "この申請は既に処理されています" },
        { status: 400 }
      );
    }

    // Update verification request
    const updatedRequest = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        note,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    });

    // If approved, update the user's profile
    if (action === "approve") {
      await prisma.profile.update({
        where: { userId: verificationRequest.userId },
        data: { isVerified: true },
      });
    }

    return NextResponse.json(publicRequest(updatedRequest));
  } catch (error) {
    console.error("Admin verification action error:", error);
    return NextResponse.json(
      { error: "認証申請の処理に失敗しました" },
      { status: 500 }
    );
  }
}
