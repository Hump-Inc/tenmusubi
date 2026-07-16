import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminEmails } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json(
        { error: "メール設定が完了していません" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const body = await request.json();
    const { name, email, inquiryType, subject, message } = body;

    // Validate required fields
    if (!name || !email || !inquiryType || !subject || !message) {
      return NextResponse.json(
        { error: "すべての項目を入力してください" },
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

    // Map inquiry type to Japanese label
    const inquiryTypeLabels: Record<string, string> = {
      general: "一般的なお問い合わせ",
      account: "アカウントについて",
      matching: "マッチングについて",
      payment: "お支払いについて",
      report: "トラブル・報告",
      other: "その他",
    };

    const inquiryTypeLabel = inquiryTypeLabels[inquiryType] || inquiryType;

    // Send email to admin
    const { error } = await resend.emails.send({
      from: "てんむすび <noreply@tenmusubi.net>",
      to: getAdminEmails().length > 0 ? getAdminEmails() : ["info@example.com"],
      replyTo: email,
      subject: `【お問い合わせ】${subject}`,
      html: `
        <h2>お問い合わせがありました</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5; width: 120px;"><strong>お名前</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>メールアドレス</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>お問い合わせ種別</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${inquiryTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>件名</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5; vertical-align: top;"><strong>お問い合わせ内容</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${message}</td>
          </tr>
        </table>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "メールの送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "お問い合わせを受け付けました" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "送信に失敗しました。しばらく経ってからお試しください" },
      { status: 500 }
    );
  }
}
