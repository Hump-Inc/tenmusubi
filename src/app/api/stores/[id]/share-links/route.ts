import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShareToken } from "@/lib/shareToken";

async function assertEditable(storeId: string, userId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "店舗が見つかりません", status: 404 as const };
  if (store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "この店舗を操作する権限がありません", status: 403 as const };
  }
  return { store };
}

// passwordHash は外に出さず、設定の有無だけを返す
const LINK_SELECT = {
  id: true,
  token: true,
  label: true,
  expiresAt: true,
  revokedAt: true,
  viewCount: true,
  printCount: true,
  lastViewedAt: true,
  createdAt: true,
} as const;

type LinkRow = {
  passwordHash?: string | null;
  [key: string]: unknown;
};

function shape(link: LinkRow & { passwordHash?: string | null }) {
  const { passwordHash, ...rest } = link;
  return { ...rest, hasPassword: !!passwordHash };
}

// GET: 共有リンクの一覧
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

    const links = await prisma.shareLink.findMany({
      where: { storeId: id },
      orderBy: { createdAt: "desc" },
      select: { ...LINK_SELECT, passwordHash: true, _count: { select: { leads: true } } },
    });

    return NextResponse.json({ links: links.map(shape) });
  } catch (error) {
    console.error("Share link GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// POST: 共有リンクを発行する
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

    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "有効期限の指定が不正です" }, { status: 400 });
    }

    const link = await prisma.shareLink.create({
      data: {
        storeId: id,
        token: generateShareToken(),
        label: label || null,
        expiresAt,
        passwordHash: password ? await bcrypt.hash(password, 10) : null,
      },
      select: { ...LINK_SELECT, passwordHash: true },
    });

    return NextResponse.json({ link: shape(link) }, { status: 201 });
  } catch (error) {
    console.error("Share link POST error:", error);
    return NextResponse.json({ error: "発行に失敗しました" }, { status: 500 });
  }
}
