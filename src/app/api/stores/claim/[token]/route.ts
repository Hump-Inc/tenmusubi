import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyStoreClaimToken } from "@/lib/tokens";

// GET: クレーム対象店舗のプレビュー（トークンは消費しない）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const storeId = await verifyStoreClaimToken(token, { consume: false });
    if (!storeId) {
      return NextResponse.json(
        { error: "無効または期限切れのリンクです" },
        { status: 404 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        images: { orderBy: { order: "asc" } },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    if (store.ownerId || store.claimStatus === "claimed") {
      return NextResponse.json(
        { error: "この店舗は既に承認済みです", alreadyClaimed: true },
        { status: 409 }
      );
    }

    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        description: store.description,
        category: store.category,
        area: store.area,
        website: store.website,
        instagram: store.instagram,
        twitter: store.twitter,
        claimEmail: store.claimEmail,
        images: store.images.map((img) => ({ id: img.id, url: img.url })),
      },
    });
  } catch (error) {
    console.error("Store claim preview error:", error);
    return NextResponse.json({ error: "店舗情報の取得に失敗しました" }, { status: 500 });
  }
}

// POST: 承認してアカウントを作成（または既存ユーザーに紐付け）し、店舗を公開
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // まずはトークンの妥当性のみ確認（成功時に消費する）
    const storeId = await verifyStoreClaimToken(token, { consume: false });
    if (!storeId) {
      return NextResponse.json(
        { error: "無効または期限切れのリンクです" },
        { status: 404 }
      );
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }
    if (store.ownerId || store.claimStatus === "claimed") {
      return NextResponse.json(
        { error: "この店舗は既に承認済みです" },
        { status: 409 }
      );
    }

    const session = await auth();

    // --- ケースA: 既にログイン済み → その人に紐付け ---
    if (session?.user?.id) {
      const userId = session.user.id;
      await claimStore(storeId, userId);
      await verifyStoreClaimToken(token, { consume: true });
      return NextResponse.json({ ok: true, mode: "linked" });
    }

    // --- ケースB: 新規アカウント作成 ---
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "お名前・メールアドレス・パスワードを入力してください" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        {
          error: "このメールアドレスは既に登録されています。ログインしてから承認してください。",
          needsLogin: true,
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        userType: JSON.stringify(["vendor"]),
        // 管理者作成ページのクレームは本人確認済みリンク経由のためメール認証済み扱い
        emailVerified: new Date(),
      },
    });

    await prisma.profile.create({
      data: {
        userId: user.id,
        displayName: name,
      },
    });

    await claimStore(storeId, user.id);
    await verifyStoreClaimToken(token, { consume: true });

    return NextResponse.json({ ok: true, mode: "created", email });
  } catch (error) {
    console.error("Store claim error:", error);
    return NextResponse.json({ error: "承認処理に失敗しました" }, { status: 500 });
  }
}

// 店舗を指定ユーザーに紐付け、公開状態にする
async function claimStore(storeId: string, userId: string) {
  await prisma.store.update({
    where: { id: storeId },
    data: {
      ownerId: userId,
      claimStatus: "claimed",
      claimedAt: new Date(),
      isActive: true,
    },
  });
}
