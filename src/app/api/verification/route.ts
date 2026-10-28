import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadPrivateFile } from "@/lib/storage";
import { sanitizeUpload } from "@/lib/imageSanitize";
import { DOCUMENT_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/fileType";
import {
  publicRequest,
  removeVerificationFiles,
  VERIFICATION_DOCUMENT_TYPES,
} from "@/lib/verification";

// GET: 認証申請のステータスを取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const [verificationRequest, profile] = await Promise.all([
      prisma.verificationRequest.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { isVerified: true },
      }),
    ]);

    return NextResponse.json({
      isVerified: profile?.isVerified || false,
      request: verificationRequest ? publicRequest(verificationRequest) : null,
    });
  } catch (error) {
    console.error("Verification status error:", error);
    return NextResponse.json(
      { error: "認証ステータスの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 認証申請を提出（multipart: documentType, file）
//
// 身分証などを扱うため、書類は公開バケットではなく非公開バケットに置く。
// 公開URLは発行せず、管理者だけが /api/admin/verification/[id]/file から見られる。
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    const documentType = String(formData.get("documentType") || "");
    const file = formData.get("file") as File | null;

    if (!VERIFICATION_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: "書類の種類を選択してください" },
        { status: 400 }
      );
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "書類のファイルを選択してください" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingRequest = await prisma.verificationRequest.findUnique({
      where: { userId },
    });
    if (existingRequest?.status === "pending") {
      return NextResponse.json(
        { error: "既に審査中の申請があります" },
        { status: 400 }
      );
    }

    // 形式はマジックナンバーで判定し、画像は再エンコードして EXIF（GPS情報を含む）を落とす
    const sanitized = await sanitizeUpload(Buffer.from(await file.arrayBuffer()), DOCUMENT_MIME_TYPES);
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }
    const documentKey = `verification/${userId}/${randomBytes(16).toString("hex")}.${sanitized.file.ext}`;
    await uploadPrivateFile(sanitized.file.buffer, documentKey, sanitized.file.mime);

    const data = {
      documentType,
      documentKey,
      documentUrl: null,
      status: "pending",
      note: null,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
    };
    const saved = existingRequest
      ? await prisma.verificationRequest.update({ where: { userId }, data })
      : await prisma.verificationRequest.create({ data: { userId, ...data } });

    // 再申請（却下後）なら、前の書類は要らないので消す
    if (existingRequest) await removeVerificationFiles(existingRequest);

    return NextResponse.json(publicRequest(saved), { status: existingRequest ? 200 : 201 });
  } catch (error) {
    console.error("Verification submit error:", error);
    return NextResponse.json(
      { error: "認証申請の提出に失敗しました" },
      { status: 500 }
    );
  }
}
