"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  Plus,
  MapPin,
  Users,
  Pencil,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface MyEvent {
  id: string;
  title: string;
  venueName: string;
  area: string;
  startAt: string;
  endAt: string;
  exhibitFee: number;
  slots: number | null;
  status: string;
  images: { id: string; url: string }[];
  _count: { applications: number };
}

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  published: "公開中",
  closed: "募集終了",
  cancelled: "中止",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  published: "bg-green-100 text-green-700 hover:bg-green-100",
  closed: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
};

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const same = s.toDateString() === e.toDateString();
  const d = (x: Date) => `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
  return same ? d(s) : `${d(s)}〜${d(e)}`;
}

export default function MyEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/events/my");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setEvents(data.events);
      setOrganizerStatus(data.organizer?.status ?? null);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/events/my");
      return;
    }
    if (status === "authenticated") fetchEvents();
  }, [status, router, fetchEvents]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

  const approved = organizerStatus === "approved";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-orange-500" />
                マイイベント
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                出店者を募集しているイベントの一覧です。
              </p>
            </div>
            {approved && (
              <Button className="rounded-full" asChild>
                <Link href="/events/new">
                  <Plus className="h-4 w-4 mr-2" />
                  募集をつくる
                </Link>
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {!approved && (
            <Card className="rounded-2xl border-0 shadow-sm mb-6">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {organizerStatus === "pending"
                      ? "主催者の審査中です"
                      : organizerStatus === "rejected"
                        ? "主催者の登録が承認されていません"
                        : "主催者の登録が必要です"}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    承認されると、出店募集を掲載できるようになります。
                  </p>
                  <Button variant="outline" className="rounded-full mt-4" asChild>
                    <Link href="/organizer">主催者情報へ</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {events.length === 0 ? (
            approved && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">
                    まだ募集がありません。
                    <br />
                    最初の出店募集をつくってみましょう。
                  </p>
                  <Button className="rounded-full" asChild>
                    <Link href="/events/new">
                      <Plus className="h-4 w-4 mr-2" />
                      募集をつくる
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id}>
                  <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
                    <div className="flex">
                      <div className="relative w-28 sm:w-40 shrink-0 bg-gray-100">
                        {e.images[0]?.url ? (
                          <Image src={e.images[0].url} alt="" fill className="object-cover" sizes="160px" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <CalendarDays className="h-7 w-7 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <CardContent className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/events/${e.id}`}
                            className="font-bold text-gray-900 hover:underline line-clamp-2"
                          >
                            {e.title}
                          </Link>
                          <Badge className={`shrink-0 ${STATUS_STYLE[e.status] ?? ""}`}>
                            {STATUS_LABEL[e.status] ?? e.status}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatRange(e.startAt, e.endAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {e.area}
                          </span>
                          <span className="inline-flex items-center gap-1 text-orange-600">
                            <Users className="h-3 w-3" />
                            応募 {e._count.applications}件
                            {e.slots ? ` / ${e.slots}枠` : ""}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-full text-xs h-7" asChild>
                            <Link href={`/events/${e.id}`} target="_blank">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {e.status === "draft" ? "プレビュー" : "公開ページ"}
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-full text-xs h-7" asChild>
                            <Link href={`/events/${e.id}/edit`}>
                              <Pencil className="h-3 w-3 mr-1" />
                              編集
                            </Link>
                          </Button>
                          <Button size="sm" className="rounded-full text-xs h-7" asChild>
                            <Link href={`/events/${e.id}/applications`}>
                              <Users className="h-3 w-3 mr-1" />
                              応募 {e._count.applications}件
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
