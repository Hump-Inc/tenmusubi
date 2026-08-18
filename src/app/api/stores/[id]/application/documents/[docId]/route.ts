import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePrivateFile } from "@/lib/storage";
import { DOCUMENT_VISIBILITIES } from "@/lib/constants";

const VALID_VISIBILITIES = DOCUMENT_VISIBILITIES.map((v) => v.value as string);

async function loadDocument(storeId: string, docId: string, userId: string) {
  const document = await prisma.applicationDocument.findUnique({
    where: { id: docId },
    include: { store: { select: { ownerId: true } } },
  });
  if (!document || document.storeId !== storeId) {
    return { error: "書類が見つかりません", status: 404 as const };
  }
  if (document.store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "この書類を操作する権限がありません", status: 403 as const };
  }
  return { document };
}

// PATCH: ラベル・有効期限・公開範囲を更新する
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, docId } = await params;
    const result = await loadDocument(id, docId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const data: {
      label?: string | null;
      expiresOn?: Date | null;
      visibility?: string;
      order?: number;
    } = {};

    if ("label" in body) {
      const label = typeof body.label === "string" ? body.label.trim() : "";
      data.label = label ? label.slice(0, 100) : null;
    }
    if ("expiresOn" in body) {
      data.expiresOn = body.expiresOn ? new Date(body.expiresOn) : null;
    }
    if ("visibility" in body) {
      if (!VALID_VISIBILITIES.includes(body.visibility)) {
        return NextResponse.json({ error: "公開範囲の指定が不正です" }, { status: 400 });
      }
      data.visibility = body.visibility;
    }
    if ("order" in body && Number.isFinite(Number(body.order))) {
      data.order = Math.round(Number(body.order));
    }

    const document = await prisma.applicationDocument.update({
      where: { id: docId },
      data,
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

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Document PATCH error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: 書類を削除する（R2 の実体も消す）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, docId } = await params;
    const result = await loadDocument(id, docId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await deletePrivateFile(result.document.fileKey).catch((e) => {
      // 実体が消せなくてもレコードは消す。孤児ファイルの方が害が小さい。
      console.error("Document file delete error:", e);
    });
    await prisma.applicationDocument.delete({ where: { id: docId } });

    return NextResponse.json({ message: "書類を削除しました" });
  } catch (error) {
    console.error("Document DELETE error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
