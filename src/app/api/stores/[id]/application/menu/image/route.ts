import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { sanitizeUpload } from "@/lib/imageSanitize";
import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/fileType";

/**
 * メニュー写真のアップロード。
 * 書類と違い公開前提なので公開バケットに置くが、EXIF は同じく落とす。
 */
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
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }
    if (store.ownerId !== session.user.id && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const sanitized = await sanitizeUpload(raw, IMAGE_MIME_TYPES);
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const key = `application-menu/${id}/${randomBytes(12).toString("hex")}.${sanitized.file.ext}`;
    const url = await uploadFile(sanitized.file.buffer, key, sanitized.file.mime);

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("Menu image upload error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
