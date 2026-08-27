import { prisma } from "./prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "てんむすび <noreply@tenmusubi.net>";
const BASE_URL = process.env.AUTH_URL || "http://localhost:3000";

// "event" はフォロー中の主催者からの新着募集。応募のやり取り("booking")に
// 相乗りさせると、やり取りのメールを切った人に新着が届かなくなるので分けている。
type NotificationType = "message" | "booking" | "review" | "event";

interface NotificationSettings {
  email: {
    messages: boolean;
    bookings: boolean;
    reviews: boolean;
    events: boolean;
    marketing: boolean;
  };
}

const defaultSettings: NotificationSettings = {
  email: {
    messages: true,
    bookings: true,
    reviews: true,
    // 自分でフォローした結果として届くものなので既定はオン
    events: true,
    marketing: false,
  },
};

const typeToSettingKey: Record<NotificationType, keyof NotificationSettings["email"]> = {
  message: "messages",
  booking: "bookings",
  review: "reviews",
  event: "events",
};

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  // アプリ内通知を作成
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link },
  });

  // メール通知を送信（ユーザー設定を確認）
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, notificationSettings: true },
    });

    if (!user?.email) return notification;

    const settings: NotificationSettings = user.notificationSettings
      ? JSON.parse(user.notificationSettings)
      : defaultSettings;

    const settingKey = typeToSettingKey[type];
    // 保存済みの設定がこの項目より前のものだと undefined になる。既定値で補う。
    const enabled = settings.email?.[settingKey] ?? defaultSettings.email[settingKey];
    if (!enabled) return notification;

    const fullLink = link ? `${BASE_URL}${link}` : BASE_URL;

    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `【てんむすび】${title}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
          <h2 style="color: #d35f2d;">てんむすび</h2>
          <p style="font-size: 16px; font-weight: bold;">${title}</p>
          <p>${body}</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${fullLink}" style="background-color: #d35f2d; color: white; padding: 12px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
              確認する
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 12px; color: #999;">
            通知設定は<a href="${BASE_URL}/settings/notifications" style="color: #d35f2d;">こちら</a>から変更できます。
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }

  return notification;
}
