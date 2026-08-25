"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  MapPin,
  Coins,
  CheckCircle2,
  MessageCircle,
  FileCheck2,
  Search,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatFee } from "@/lib/eventFormat";

interface MyApplication {
  id: string;
  status: string;
  kind: string;
  createdAt: string;
  lastMessageAt: string | null;
  store: { id: string; name: string };
  event: {
    id: string;
    title: string;
    venueName: string;
    area: string;
    startAt: string;
    exhibitFee: number;
    exhibitFeeMax: number | null;
    status: string;
    organizer: { orgName: string };
  };
  _count: { disclosures: number };
}

const STATUS_LABEL: Record<string, string> = {
  open: "やり取り中",
  confirmed: "出店決定",
  rejected: "見送り",
  withdrawn: "取り下げ",
};
const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  confirmed: "bg-green-100 text-green-700 hover:bg-green-100",
  rejected: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  withdrawn: "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

function formatDate(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function ApplicationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justApplied = searchParams.get("applied") === "1";

  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/applications/my");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setApplications(data.applications);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/events/applications");
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, load]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

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

          <h1 className="text-2xl font-bold text-gray-900 mb-2">応募した募集</h1>
          <p className="text-sm text-gray-600 mb-6">
            主催者とのやり取りと、出店が決まったかどうかを確認できます。
          </p>

          {justApplied && (
            <Card className="rounded-2xl border-0 shadow-sm bg-green-50 mb-6">
              <CardContent className="p-5 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">応募しました</p>
                  <p className="text-sm text-green-800 mt-1">
                    主催者からの返信をお待ちください。書類は、やり取りの中でご自身が開示を選ぶまで相手に見えません。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {applications.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-gray-500 mb-4">
                  まだ応募していません。
                  <br />
                  出店できそうな募集を探してみましょう。
                </p>
                <Button className="rounded-full" asChild>
                  <Link href="/search?type=event">
                    <Search className="h-4 w-4 mr-2" />
                    出店募集を探す
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {applications.map((a) => (
                <li key={a.id}>
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/events/${a.event.id}`}
                            className="font-bold text-gray-900 hover:underline"
                          >
                            {a.event.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-1">
                            主催 {a.event.organizer.orgName} ・ {a.store.name}で応募
                          </p>
                        </div>
                        <Badge className={`shrink-0 ${STATUS_STYLE[a.status] ?? ""}`}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(a.event.startAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {a.event.area} ・ {a.event.venueName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {formatFee(a.event.exhibitFee, null, a.event.exhibitFeeMax)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>{formatDate(a.createdAt)} 応募</span>
                          <span className="inline-flex items-center gap-1">
                            <FileCheck2 className="h-3 w-3" />
                            {a._count.disclosures > 0
                              ? `書類 ${a._count.disclosures}件を開示中`
                              : "書類は未開示"}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link href={`/events/applications/${a.id}`}>
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            やり取りを見る
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
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

export default function MyApplicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ApplicationsContent />
    </Suspense>
  );
}
