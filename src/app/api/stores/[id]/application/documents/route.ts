import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadPrivateFile } from "@/lib/storage";
import { sanitizeUpload } from "@/lib/imageSanitize";
import { DOCUMENT_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/fileType";
import { DOCUMENT_TYPES, DOCUMENT_VISIBILITIES } from "@/lib/constants";

const VALID_TYPES = DOCUMENT_TYPES.map((t) => t.value as string);
const VALID_VISIBILITIES = DOCUMENT_VISIBILITIES.map((v) => v.value as string);

async function assertEditable(storeId: string, userId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "店舗が見つかりません", status: 404 as const };
  if (store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "この店舗を編集する権限がありません", status: 403 as const };
  }
  return { store };
}

// POST: 書類をアップロードする
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
    const check = await assertEditable(id, session.user.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = String(formData.get("type") || "other");
    const label = String(formData.get("label") || "").trim();
    const expiresOn = String(formData.get("expiresOn") || "").trim();
    const visibility = String(formData.get("visibility") || "meta_only");

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "書類の種類が不正です" }, { status: 400 });
    }
    if (!VALID_VISIBILITIES.includes(visibility)) {
      return NextResponse.json({ error: "公開範囲の指定が不正です" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    // 形式は拡張子や申告MIMEではなくマジックナンバーで判定し、
    // 画像は再エンコードして EXIF（GPS情報を含む）を落とす。
    const raw = Buffer.from(await file.arrayBuffer());
    const sanitized = await sanitizeUpload(raw, DOCUMENT_MIME_TYPES);
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    // 公開URLを持たない非公開バケットに、推測できないキーで保存する
    const key = `application-documents/${id}/${randomBytes(16).toString("hex")}.${sanitized.file.ext}`;
    await uploadPrivateFile(sanitized.file.buffer, key, sanitized.file.mime);

    const maxOrder = await prisma.applicationDocument.aggregate({
      where: { storeId: id },
      _max: { order: true },
    });

    const document = await prisma.applicationDocument.create({
      data: {
        storeId: id,
        type,
        label: label || null,
        fileKey: key,
        mimeType: sanitized.file.mime,
        fileSize: sanitized.file.buffer.length,
        expiresOn: expiresOn ? new Date(expiresOn) : null,
        visibility,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      // fileKey は返さない
      select: {
        id: true,
        type: true,
        label: true,
        mimeType: true,
        fileSize: true,
        expiresOn: true,
        visibility: true,
        order: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
