import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStoreClaimToken, deleteStoreClaimToken } from "@/lib/tokens";

const BASE_URL = process.env.AUTH_URL || "http://localhost:3000";

// POST: クレーム招待リンクを発行（管理者が手渡しで営業者に渡す想定）
export async function POST(
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

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }
    if (store.ownerId) {
      return NextResponse.json(
        { error: "既にオーナーが紐付いている店舗です" },
        { status: 400 }
      );
    }

    // 招待先メモ（任意）
    let claimEmail: string | null = store.claimEmail;
    try {
      const body = await request.json();
      if (typeof body?.claimEmail === "string") {
        claimEmail = body.claimEmail.trim() || null;
      }
    } catch {
      // body無しでもOK
    }

    const token = await createStoreClaimToken(id);

    const updated = await prisma.store.update({
      where: { id },
      data: {
        claimEmail,
        claimStatus: "invited",
        invitedAt: new Date(),
      },
    });

    const claimUrl = `${BASE_URL}/stores/claim/${token}`;
    const qrDataUrl = await QRCode.toDataURL(claimUrl, { width: 512, margin: 1 });

    return NextResponse.json({
      claimUrl,
      qrDataUrl,
      store: {
        id: updated.id,
        name: updated.name,
        claimStatus: updated.claimStatus,
        claimEmail: updated.claimEmail,
        invitedAt: updated.invitedAt,
      },
    });
  } catch (error) {
    console.error("Admin store invite error:", error);
    return NextResponse.json({ error: "招待リンクの発行に失敗しました" }, { status: 500 });
  }
}

// DELETE: 招待を取り消す（未承認の場合のみ）
export async function DELETE(
  _request: Request,
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

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }
    if (store.claimStatus === "claimed") {
      return NextResponse.json(
        { error: "既に承認済みのため取り消せません" },
        { status: 400 }
      );
    }

    await deleteStoreClaimToken(id);

    const updated = await prisma.store.update({
      where: { id },
      data: { claimStatus: "none", invitedAt: null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin store invite revoke error:", error);
    return NextResponse.json({ error: "招待の取り消しに失敗しました" }, { status: 500 });
  }
}
