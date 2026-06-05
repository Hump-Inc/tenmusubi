import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "profile", "space", or "store"
    const targetId = formData.get("targetId") as string | null;
    const isDraft = formData.get("isDraft") === "true";

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    // ブログ画像は管理者のみアップロード可
    if (type === "blog" && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WebP, GIF形式の画像のみアップロード可能です" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const prefix =
      type === "profile"
        ? "profiles"
        : type === "space"
          ? "spaces"
          : type === "blog"
            ? "blog"
            : "stores";
    const id = type === "profile" ? session.user.id : targetId || session.user.id;
    const filename = `${prefix}/${id}_${timestamp}.${extension}`;

    // Upload to R2
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageUrl = await uploadFile(buffer, filename, file.type);

    // Save to database based on type
    if (type === "profile") {
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
      });

      if (profile) {
        await prisma.profileImage.create({
          data: {
            profileId: profile.id,
            url: imageUrl,
            order: 0,
          },
        });
      }
    } else if (type === "space" && targetId) {
      // Verify ownership
      const space = await prisma.space.findUnique({
        where: { id: targetId },
      });

      if (!space || space.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: "このスペースに画像を追加する権限がありません" },
          { status: 403 }
        );
      }

      await prisma.spaceImage.create({
        data: {
          spaceId: targetId,
          url: imageUrl,
          order: 0,
        },
      });
    } else if (type === "store" && targetId) {
      // Verify ownership or admin
      const store = await prisma.store.findUnique({
        where: { id: targetId },
      });

      const adminUser = await isAdmin(session.user.id);
      if (!store || (store.ownerId !== session.user.id && !adminUser)) {
        return NextResponse.json(
          { error: "この店舗に画像を追加する権限がありません" },
          { status: 403 }
        );
      }

      await prisma.storeImage.create({
        data: {
          storeId: targetId,
          url: imageUrl,
          order: 0,
          isDraft,
        },
      });
    }

    return NextResponse.json({ url: imageUrl }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "アップロードに失敗しました";
    console.error("Upload error detail:", message);
    return NextResponse.json(
      { error: "アップロードに失敗しました", detail: message },
      { status: 500 }
    );
  }
}
