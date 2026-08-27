"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  Calendar,
  CalendarDays,
  Star,
  Megaphone,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
    events: true,
    marketing: false,
  },
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/notifications/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleToggle = async (category: "email", key: keyof NotificationSettings["email"]) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: !settings[category][key],
      },
    };

    setSettings(newSettings);
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "設定を保存しました" });
      } else {
        // ロールバック
        setSettings(settings);
        setMessage({ type: "error", text: "設定の保存に失敗しました" });
      }
    } catch {
      setSettings(settings);
      setMessage({ type: "error", text: "設定の保存に失敗しました" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const notificationItems = [
    {
      key: "messages" as const,
      icon: MessageCircle,
      label: "メッセージ通知",
      description: "新しいメッセージを受信した際にメールで通知します",
    },
    {
      key: "bookings" as const,
      icon: Calendar,
      label: "予約・申請通知",
      description: "出店募集への応募、承認、見送りの際にメールで通知します",
    },
    {
      key: "reviews" as const,
      icon: Star,
      label: "レビュー通知",
      description: "新しいレビューが投稿された際にメールで通知します",
    },
    {
      key: "events" as const,
      icon: CalendarDays,
      label: "フォロー中の主催者の新着募集",
      description: "フォローしている主催者が新しい募集を公開した際にメールで通知します",
    },
    {
      key: "marketing" as const,
      icon: Megaphone,
      label: "お知らせ・キャンペーン",
      description: "新機能やキャンペーン情報をメールでお届けします",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold">通知設定</h1>
            <p className="mt-2 text-muted-foreground">
              メール通知の受信設定を管理します
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                メール通知
              </CardTitle>
              <CardDescription>
                各種通知のメール受信を設定します
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1">
                  {notificationItems.map((item, index) => (
                    <div key={item.key}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-start gap-3 flex-1 mr-4">
                          <item.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                              {item.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={item.key}
                          checked={settings.email[item.key]}
                          onCheckedChange={() => handleToggle("email", item.key)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 p-4 rounded-xl bg-muted/50">
            <h3 className="font-medium text-sm">通知について</h3>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>・重要なアカウント関連の通知（パスワードリセット等）はオフにできません</li>
              <li>・設定変更は即時反映されます</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
