import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface NotificationSettings {
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
    events: true,
    marketing: false,
  },
};

// GET: 通知設定を取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationSettings: true },
    });

    const settings = user?.notificationSettings
      ? JSON.parse(user.notificationSettings)
      : defaultSettings;

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      { error: "通知設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: 通知設定を更新
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.email || typeof body.email !== "object") {
      return NextResponse.json(
        { error: "無効な設定形式です" },
        { status: 400 }
      );
    }

    const settings: NotificationSettings = {
      email: {
        messages: !!body.email.messages,
        bookings: !!body.email.bookings,
        reviews: !!body.email.reviews,
        events: !!body.email.events,
        marketing: !!body.email.marketing,
      },
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationSettings: JSON.stringify(settings) },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      { error: "通知設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
