import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { resolveShareLink } from "@/lib/shareLink";
import { shareUnlockValue } from "@/lib/shareToken";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/shareToken";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 総当たりを避けるため、解錠試行にも制限をかける
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit("share-unlock", ip, 20, 60 * 10);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらくしてからお試しください" },
      { status: 429 }
    );
  }

  const { status, link } = await resolveShareLink(token);
  if (status !== "ok" || !link || !link.passwordHash) {
    return NextResponse.json({ error: "確認できませんでした" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!(await bcrypt.compare(password, link.passwordHash))) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }

  // パスワードそのものはクッキーに載せず、リンクIDとハッシュから導出した値を置く
  const store = await cookies();
  store.set(`share_unlock_${link.id}`, shareUnlockValue(link.id, link.passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ message: "ok" });
}
