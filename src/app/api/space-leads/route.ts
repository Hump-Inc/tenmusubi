import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveShareLink } from "@/lib/shareLink";
import { getClientIp } from "@/lib/shareToken";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * スペースオーナーからの相談を受け取る。
 * この段階の目的は成約ではなく接点の獲得なので、項目は最小限に留める。
 */
export async function POST(request: Request) {
  try {
    const limit = await checkRateLimit(
      "space-lead",
      getClientIp(request.headers),
      RATE_LIMITS.spaceLead.limit,
      RATE_LIMITS.spaceLead.windowSeconds
    );
    if (!limit.ok) {
      return NextResponse.json(
        { error: "送信が集中しています。しばらくしてからお試しください" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // honeypot。CAPTCHA は主催者・オーナーの離脱要因になるので使わない。
    if (typeof body.website === "string" && body.website.trim()) {
      // ボットには成功したように見せて、保存はしない
      return NextResponse.json({ message: "ok" }, { status: 201 });
    }

    const spaceName = typeof body.spaceName === "string" ? body.spaceName.trim() : "";
    const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
    const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const contactPhone = typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const token = typeof body.token === "string" ? body.token : "";

    if (!spaceName || !contactName) {
      return NextResponse.json(
        { error: "スペース名とご担当者名を入力してください" },
        { status: 400 }
      );
    }
    if (!contactEmail && !contactPhone) {
      return NextResponse.json(
        { error: "メールアドレスか電話番号のいずれかを入力してください" },
        { status: 400 }
      );
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // どの共有リンク経由か、どの出店者の紹介かを必ず残す。
    // 失効済みのリンクでも、経路としては記録する。
    let shareLinkId: string | null = null;
    let storeId: string | null = null;
    if (token) {
      const { link } = await resolveShareLink(token);
      if (link) {
        shareLinkId = link.id;
        storeId = link.storeId;
      }
    }

    const lead = await prisma.spaceLead.create({
      data: {
        shareLinkId,
        storeId,
        spaceName: spaceName.slice(0, 200),
        area: typeof body.area === "string" ? body.area.trim().slice(0, 100) || null : null,
        contactName: contactName.slice(0, 100),
        contactEmail: contactEmail ? contactEmail.slice(0, 200) : null,
        contactPhone: contactPhone ? contactPhone.slice(0, 40) : null,
        note: note ? note.slice(0, 1000) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ message: "ok", id: lead.id }, { status: 201 });
  } catch (error) {
    console.error("Space lead POST error:", error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
