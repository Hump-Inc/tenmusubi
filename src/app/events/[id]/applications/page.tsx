"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Users,
  MessageCircle,
  FileCheck2,
  Store as StoreIcon,
  Inbox,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicantSpecList, FitBadges } from "@/components/events/ApplicantSpecList";
import type { ApplicationSnapshot } from "@/lib/eventApplicationSnapshot";

interface Row {
  id: string;
  kind: string;
  status: string;
  message: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  hasUnread: boolean;
  disclosureCount: number;
  messageCount: number;
  store: {
    id: string;
    name: string;
    category: string | null;
    images: { id: string; url: string }[];
  };
  snapshot: ApplicationSnapshot | null;
  fit: { label: string; ok: boolean; detail: string }[];
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

export default function EventApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [stats, setStats] = useState<Record<string, number | null>>({});
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${id}/applications`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setRows(data.applications);
      setEventTitle(data.event.title);
      setStats(data.stats);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/events/${id}/applications`);
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, id, load]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href={`/events/${id}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            募集ページに戻る
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-orange-500" />
                応募一覧
              </h1>
              <p className="text-sm text-gray-600 mt-1 truncate">{eventTitle}</p>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="open">やり取り中</SelectItem>
                <SelectItem value="confirmed">出店決定</SelectItem>
                <SelectItem value="rejected">見送り</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              ["応募", stats.total],
              ["やり取り中", stats.open],
              ["出店決定", stats.confirmed],
              ["募集枠", stats.slots],
            ].map(([label, value]) => (
              <Card key={String(label)} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {visible.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Inbox className="h-10 w-10 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-gray-500">
                  {rows.length === 0
                    ? "まだ応募がありません"
                    : "この条件に該当する応募はありません"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => (
                <li key={r.id}>
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {r.store.images[0]?.url ? (
                            <Image
                              src={r.store.images[0].url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <StoreIcon className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-gray-900">{r.store.name}</p>
                            <Badge className={STATUS_STYLE[r.status] ?? ""}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </Badge>
                            {r.hasUnread && (
                              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-white">
                                新着
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {r.store.category || "業種未設定"} ・ {formatDate(r.createdAt)} 応募
                          </p>
                          <div className="mt-2">
                            <FitBadges fit={r.fit} />
                          </div>
                        </div>
                      </div>

                      {r.message && (
                        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                          {r.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {r.messageCount}件
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileCheck2 className="h-3 w-3" />
                            {r.disclosureCount > 0
                              ? `書類 ${r.disclosureCount}件が開示中`
                              : "書類は未開示"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {r.snapshot && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            >
                              条件
                              {expanded === r.id ? (
                                <ChevronUp className="ml-1 h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="ml-1 h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="rounded-full" asChild>
                            <Link href={`/events/applications/${r.id}`}>やり取りを見る</Link>
                          </Button>
                        </div>
                      </div>

                      {expanded === r.id && r.snapshot && (
                        <div className="border-t border-gray-100 pt-4">
                          <ApplicantSpecList snapshot={r.snapshot} fit={r.fit} />
                        </div>
                      )}
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
