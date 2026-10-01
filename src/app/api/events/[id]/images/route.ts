import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { sanitizeUpload } from "@/lib/imageSanitize";
import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/fileType";

/**
 * 募集の写真。公開ページに出るものなので公開バケットに置くが、
 * EXIF（GPS情報を含む）は他の画像と同じく落とす。
 */
async function assertEditable(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organizer: { select: { userId: true } } },
  });
  if (!event) return { error: "募集が見つかりません", status: 404 as const };
  if (event.organizer.userId !== userId && !(await isAdmin(userId))) {
    return { error: "この募集を編集する権限がありません", status: 403 as const };
  }
  return { event };
}

const MAX_IMAGES = 6;

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

    const count = await prisma.eventImage.count({ where: { eventId: id } });
    if (count >= MAX_IMAGES) {
      return NextResponse.json(
        { error: `写真は${MAX_IMAGES}枚までです` },
        { status: 400 }
      );
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

    const key = `events/${id}/${randomBytes(12).toString("hex")}.${sanitized.file.ext}`;
    const url = await uploadFile(sanitized.file.buffer, key, sanitized.file.mime);

    const maxOrder = await prisma.eventImage.aggregate({
      where: { eventId: id },
      _max: { order: true },
    });

    const image = await prisma.eventImage.create({
      data: { eventId: id, url, order: (maxOrder._max.order ?? -1) + 1 },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Event image POST error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}

// GET: 募集の写真一覧（編集画面で使う）
export async function GET(
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

    const images = await prisma.eventImage.findMany({
      where: { eventId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Event image GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
