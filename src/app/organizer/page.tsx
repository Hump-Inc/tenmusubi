"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Organizer {
  id: string;
  orgName: string;
  contactName: string | null;
  phone: string | null;
  website: string | null;
  intro: string | null;
  status: string;
  note: string | null;
  reviewedAt: string | null;
}

const STATUS_VIEW: Record<
  string,
  { icon: typeof Clock; label: string; body: string; cls: string; iconCls: string }
> = {
  pending: {
    icon: Clock,
    label: "審査中です",
    body: "運営が内容を確認しています。承認されると出店募集を掲載できるようになります。",
    cls: "bg-amber-50 text-amber-900",
    iconCls: "text-amber-600",
  },
  approved: {
    icon: CheckCircle2,
    label: "承認済みです",
    body: "出店募集を掲載できます。マイページの「マイイベント」から作成してください。",
    cls: "bg-green-50 text-green-900",
    iconCls: "text-green-600",
  },
  rejected: {
    icon: XCircle,
    label: "承認されませんでした",
    body: "内容をご確認のうえ、修正して再度お送りください。",
    cls: "bg-red-50 text-red-900",
    iconCls: "text-red-600",
  },
};

export default function OrganizerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    phone: "",
    website: "",
    intro: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const fetchOrganizer = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/organizer");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      if (data.organizer) {
        setOrganizer(data.organizer);
        setForm({
          orgName: data.organizer.orgName ?? "",
          contactName: data.organizer.contactName ?? "",
          phone: data.organizer.phone ?? "",
          website: data.organizer.website ?? "",
          intro: data.organizer.intro ?? "",
        });
      }
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/organizer");
      return;
    }
    if (status === "authenticated") fetchOrganizer();
  }, [status, router, fetchOrganizer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/organizer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }
      setSaved(true);
      await fetchOrganizer();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

  const view = organizer ? STATUS_VIEW[organizer.status] : null;
  const StatusIcon = view?.icon;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">主催者情報</h1>
            <p className="text-sm text-gray-600">
              イベントやマルシェで出店者を募集するには、主催者の登録が必要です。
              出店者に安心して応募してもらうため、運営が内容を確認してから公開できるようにしています。
            </p>
          </div>

          {view && StatusIcon && (
            <Card className="rounded-2xl border-0 shadow-sm mb-6">
              <CardContent className={`p-5 rounded-2xl ${view.cls}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${view.iconCls}`} />
                  <div className="min-w-0">
                    <p className="font-medium">{view.label}</p>
                    <p className="text-sm mt-1 opacity-90">{view.body}</p>
                    {organizer?.status === "rejected" && organizer.note && (
                      <p className="text-sm mt-2 rounded-lg bg-white/60 px-3 py-2">
                        運営より: {organizer.note}
                      </p>
                    )}
                    {organizer?.status === "approved" && (
                      <Button size="sm" className="rounded-full mt-3" asChild>
                        <Link href="/events/new">
                          <CalendarDays className="h-4 w-4 mr-1" />
                          出店募集をつくる
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {saved && !organizer && (
            <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              申請を受け付けました。
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={submit}>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  {organizer ? "登録内容" : "主催者として登録する"}
                </CardTitle>
                <CardDescription>
                  出店者にはこの情報が募集ページで表示されます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">
                    団体名・主催者名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="orgName"
                    value={form.orgName}
                    onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                    placeholder="例: 〇〇マルシェ実行委員会"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">ご担当者名</Label>
                    <Input
                      id="contactName"
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      placeholder="例: 山田 太郎"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="例: 03-1234-5678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">ウェブサイト・SNS</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <p className="text-xs text-gray-500">
                    過去のイベントが分かるページがあると、審査がスムーズです。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intro">主催実績・イベントの紹介</Label>
                  <Textarea
                    id="intro"
                    value={form.intro}
                    onChange={(e) => setForm({ ...form, intro: e.target.value.slice(0, 2000) })}
                    rows={6}
                    placeholder="例: 毎月第2日曜に〇〇公園でマルシェを開催しています。2023年から通算20回、平均来場者数は3,000人ほどです。"
                  />
                  <p className="text-xs text-gray-500 text-right">{form.intro.length} / 2000</p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full rounded-full mt-6" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {organizer ? "保存する" : "登録を申請する"}
                </>
              )}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
