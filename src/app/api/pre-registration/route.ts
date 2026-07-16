import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getAdminEmails } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userType } = body;

    // Validate required fields
    if (!email || !userType) {
      return NextResponse.json(
        { error: "メールアドレスと利用目的は必須です" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // Validate userType
    if (!["vendor", "owner"].includes(userType)) {
      return NextResponse.json(
        { error: "利用目的が不正です" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.preRegistration.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    // Create pre-registration
    const registration = await prisma.preRegistration.create({
      data: {
        email,
        userType,
      },
    });

    // Send emails (await to ensure completion before function ends)
    await sendEmails(email, userType);

    return NextResponse.json(
      { message: "先行登録が完了しました", id: registration.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Pre-registration error:", error);
    return NextResponse.json(
      { error: "登録に失敗しました。しばらく経ってからお試しください" },
      { status: 500 }
    );
  }
}

async function sendEmails(email: string, userType: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[Pre-registration] RESEND_API_KEY is not configured");
    return;
  }

  console.log("[Pre-registration] Starting email send to:", email);

  const resend = new Resend(apiKey);
  const userTypeLabel = userType === "vendor" ? "出店者" : "スペースオーナー";

  // 1. Send auto-reply to user
  try {
    const { data, error } = await resend.emails.send({
      from: "てんむすび <noreply@tenmusubi.net>",
      to: email,
      subject: "【てんむすび】先行登録ありがとうございます",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">先行登録ありがとうございます</h2>
          <p>この度は「てんむすび」に先行登録いただき、誠にありがとうございます。</p>
          <p>ご登録内容：</p>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; width: 140px;"><strong>メールアドレス</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>ご利用目的</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${userTypeLabel}</td>
            </tr>
          </table>
          <p>サービス開始時には、いち早くご案内のメールをお送りいたします。</p>
          <p>今しばらくお待ちください。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            てんむすび - キッチンカー・出店マッチングサービス<br />
            <a href="https://tenmusubi.net" style="color: #3b82f6;">https://tenmusubi.net</a>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[Pre-registration] User email error:", error);
    } else {
      console.log("[Pre-registration] User email sent:", data?.id);
    }
  } catch (err) {
    console.error("[Pre-registration] User email exception:", err);
  }

  // 2. Send notification to admin
  const adminEmails = getAdminEmails();
  if (adminEmails.length > 0) {
    try {
      const { data, error } = await resend.emails.send({
        from: "てんむすび <noreply@tenmusubi.net>",
        to: adminEmails,
        subject: `【てんむすび】新規先行登録がありました（${userTypeLabel}）`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">新規先行登録のお知らせ</h2>
            <p>新しい先行登録がありました。</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; width: 140px;"><strong>メールアドレス</strong></td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>ご利用目的</strong></td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${userTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>登録日時</strong></td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</td>
              </tr>
            </table>
            <p>
              <a href="https://tenmusubi.net/admin/pre-registrations" style="color: #3b82f6;">
                管理画面で確認する →
              </a>
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("[Pre-registration] Admin email error:", error);
      } else {
        console.log("[Pre-registration] Admin email sent:", data?.id);
      }
    } catch (err) {
      console.error("[Pre-registration] Admin email exception:", err);
    }
  } else {
    console.log("[Pre-registration] CONTACT_EMAIL not configured, skipping admin notification");
  }
}
