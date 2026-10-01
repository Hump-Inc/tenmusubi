"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CalendarDays, Plus, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MyEventCard, type MyEventData } from "@/components/events/MyEventCard";

export default function MyEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<MyEventData[]>([]);
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
                  <MyEventCard event={e} />
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
