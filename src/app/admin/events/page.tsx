"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CalendarDays, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFee } from "@/lib/eventFormat";

interface AdminEvent {
  id: string;
  title: string;
  area: string;
  venueName: string;
  startAt: string;
  exhibitFee: number;
  slots: number | null;
  status: string;
  createdAt: string;
  organizer: { id: string; orgName: string; status: string };
  applicationCount: number;
  confirmedCount: number;
  openCount: number;
  unreadByOrganizer: number;
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

function formatDate(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminEventsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/admin/events${query}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setEvents(data.events);
      setStats(data.stats);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") load();
  }, [authStatus, router, load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          管理画面に戻る
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-orange-500" />
              出店募集
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              主催者が使えているか、応募が放置されていないかを確認します。
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="published">公開中</SelectItem>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="closed">募集終了</SelectItem>
              <SelectItem value="cancelled">中止</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {(
            [
              { label: "掲載数", value: stats.total },
              { label: "公開中", value: stats.published },
              { label: "下書き", value: stats.draft },
              { label: "応募", value: stats.applications },
              { label: "出店決定", value: stats.confirmed },
              { label: "未返信あり", value: stats.stalled, warn: true },
            ] as { label: string; value: number | undefined; warn?: boolean }[]
          ).map(({ label, value, warn }) => (
            <Card key={label} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p
                  className={`text-2xl font-bold ${
                    warn && (value ?? 0) > 0 ? "text-orange-600" : "text-gray-900"
                  }`}
                >
                  {value ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : events.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-4" />
              <p className="text-sm text-gray-500">該当する募集はありません</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>イベント</TableHead>
                    <TableHead>主催者</TableHead>
                    <TableHead>開催日</TableHead>
                    <TableHead className="text-right">出展料</TableHead>
                    <TableHead className="text-right">応募</TableHead>
                    <TableHead>状態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="align-top">
                        <Link
                          href={`/events/${e.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 font-medium text-gray-900 hover:underline"
                        >
                          {e.title}
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {e.area} ・ {e.venueName}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm text-gray-900">{e.organizer.orgName}</p>
                        {e.organizer.status !== "approved" && (
                          <Badge variant="outline" className="mt-1 text-xs text-amber-700">
                            未承認
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(e.startAt)}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm whitespace-nowrap">
                        {formatFee(e.exhibitFee)}
                      </TableCell>
                      <TableCell className="align-top text-right whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {e.applicationCount}
                        </span>
                        {e.slots ? (
                          <span className="text-xs text-gray-500"> / {e.slots}枠</span>
                        ) : null}
                        {e.confirmedCount > 0 && (
                          <p className="text-xs text-green-700">決定 {e.confirmedCount}</p>
                        )}
                        {e.unreadByOrganizer > 0 && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            未返信 {e.unreadByOrganizer}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={STATUS_STYLE[e.status] ?? ""}>
                          {STATUS_LABEL[e.status] ?? e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
