import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 引き継ぎ申請一覧（管理者用）
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending | approved | rejected | null(all)

    const requests = await prisma.storeClaimRequest.findMany({
      where: status ? { status } : {},
      include: {
        store: { select: { id: true, name: true, area: true, category: true, ownerId: true, claimStatus: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };

    return NextResponse.json({ requests, stats });
  } catch (error) {
    console.error("Admin claim-requests list error:", error);
    return NextResponse.json({ error: "申請一覧の取得に失敗しました" }, { status: 500 });
  }
}

// PATCH: 申請を承認 / 却下（管理者用）
// 承認時: 店舗を申請者に紐付け、公開する（既存の claim フローと同じ処理）。
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const action = body?.action; // "approve" | "reject"
    if (!id || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
    }

    const claimRequest = await prisma.storeClaimRequest.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!claimRequest) {
      return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
    }
    if (claimRequest.status !== "pending") {
      return NextResponse.json({ error: "この申請は既に処理済みです" }, { status: 409 });
    }

    if (action === "reject") {
      await prisma.storeClaimRequest.update({
        where: { id },
        data: { status: "rejected", reviewedAt: new Date(), reviewedBy: session.user.id },
      });
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    // approve: 店舗が既に他者に紐付いていないか再確認
    if (claimRequest.store.ownerId || claimRequest.store.claimStatus === "claimed") {
      return NextResponse.json(
        { error: "この店舗は既にオーナーが登録されています" },
        { status: 409 }
      );
    }

    // 店舗を申請者に紐付けて公開 + 申請を承認済みに
    await prisma.$transaction([
      prisma.store.update({
        where: { id: claimRequest.storeId },
        data: {
          ownerId: claimRequest.userId,
          claimStatus: "claimed",
          claimedAt: new Date(),
          isActive: true,
        },
      }),
      prisma.storeClaimRequest.update({
        where: { id },
        data: { status: "approved", reviewedAt: new Date(), reviewedBy: session.user.id },
      }),
      // 同じ店舗への他の審査待ち申請は却下扱いにする
      prisma.storeClaimRequest.updateMany({
        where: { storeId: claimRequest.storeId, status: "pending", NOT: { id } },
        data: { status: "rejected", reviewedAt: new Date(), reviewedBy: session.user.id },
      }),
    ]);

    return NextResponse.json({ ok: true, status: "approved" });
  } catch (error) {
    console.error("Admin claim-request review error:", error);
    return NextResponse.json({ error: "申請の処理に失敗しました" }, { status: 500 });
  }
}
