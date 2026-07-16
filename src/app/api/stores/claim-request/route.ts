import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminEmails } from "@/lib/email";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST: 既存店舗の引き継ぎ（クレーム）申請を作成
// 本人確認は運営の承認で行うため、ここでは申請を受け付けて運営に通知するだけ。
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    const message =
      typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : null;

    if (!storeId) {
      return NextResponse.json({ error: "店舗が指定されていません" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    // 既にオーナーが決まっている店舗は申請不可
    if (store.ownerId || store.claimStatus === "claimed") {
      return NextResponse.json(
        { error: "この店舗は既にオーナーが登録されています" },
        { status: 409 }
      );
    }

    // 同一ユーザーの重複申請（審査待ち）を防ぐ
    const existing = await prisma.storeClaimRequest.findFirst({
      where: { storeId, userId, status: "pending" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "この店舗への引き継ぎ申請は既に受付済みです（審査中）", alreadyRequested: true },
        { status: 409 }
      );
    }

    const claimRequest = await prisma.storeClaimRequest.create({
      data: { storeId, userId, message },
    });

    // 運営に通知メール
    const adminEmails = getAdminEmails();
    if (adminEmails.length > 0 && process.env.RESEND_API_KEY) {
      try {
        const applicant = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        await resend.emails.send({
          from: "てんむすび <noreply@tenmusubi.net>",
          to: adminEmails,
          subject: `【てんむすび】店舗の引き継ぎ申請がありました（${store.name}）`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">店舗の引き継ぎ申請</h2>
              <p>既存店舗の引き継ぎ（クレーム）申請がありました。内容をご確認ください。</p>
              <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; width: 140px;"><strong>対象店舗</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${store.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>申請者</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${applicant?.name ?? "（名前未設定）"}（${applicant?.email ?? "-"}）</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>補足</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${message ? message.replace(/</g, "&lt;") : "（なし）"}</td>
                </tr>
              </table>
              <p>
                <a href="https://tenmusubi.net/admin/claim-requests" style="color: #3b82f6;">
                  管理画面で確認する →
                </a>
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[claim-request] Admin email error:", err);
      }
    }

    return NextResponse.json({ ok: true, id: claimRequest.id }, { status: 201 });
  } catch (error) {
    console.error("Store claim request error:", error);
    return NextResponse.json({ error: "引き継ぎ申請に失敗しました" }, { status: 500 });
  }
}
