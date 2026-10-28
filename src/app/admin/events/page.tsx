"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CalendarDays, AlertTriangle, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  exhibitFeeMax: number | null;
  slots: number | null;
  status: string;
  createdAt: string;
  organizer: { id: string; orgName: string; status: string };
  applicationCount: number;
  confirmedCount: number;
  openCount: number;
  unreadByOrganizer: number;
  deletionRequestedAt: string | null;
  deletionRequestReason: string | null;
  paymentCount: number;
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
  const [busyId, setBusyId] = useState<string | null>(null);

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

  // 募集を消せるのは運営だけ。応募・やり取りも一緒に消えるので、件数を見せて確かめる。
  const handleDelete = async (e: AdminEvent) => {
    const detail =
      e.applicationCount > 0
        ? `\n応募${e.applicationCount}件と、そのやり取りも一緒に消え、元に戻せません。`
        : "\n元に戻せません。";
    if (!window.confirm(`「${e.title}」を削除しますか？${detail}`)) return;
    setBusyId(e.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/events/${e.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "削除に失敗しました");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (e: AdminEvent) => {
    const note = window.prompt(
      `「${e.title}」の削除の申請を見送ります。主催者に伝えることがあれば入力してください（空欄可）`,
      ""
    );
    if (note === null) return;
    setBusyId(e.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/events/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismissDeletionRequest", note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "更新に失敗しました");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

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
              <SelectItem value="deletion_requested">削除申請あり</SelectItem>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {(
            [
              { label: "掲載数", value: stats.total },
              { label: "公開中", value: stats.published },
              { label: "下書き", value: stats.draft },
              { label: "応募", value: stats.applications },
              { label: "出店決定", value: stats.confirmed },
              { label: "未返信あり", value: stats.stalled, warn: true },
              { label: "削除申請", value: stats.deletionRequested, warn: true },
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
                    <TableHead className="text-right">出店料</TableHead>
                    <TableHead className="text-right">応募</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
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
                        {formatFee(e.exhibitFee, null, e.exhibitFeeMax)}
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
                        {e.deletionRequestedAt && (
                          <div className="mt-2 max-w-[220px]">
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                              削除申請 {formatDate(e.deletionRequestedAt)}
                            </Badge>
                            {e.deletionRequestReason && (
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600">
                                {e.deletionRequestReason}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col items-start gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            disabled={busyId === e.id || e.paymentCount > 0}
                            title={
                              e.paymentCount > 0
                                ? "支払いの記録があるため削除できません。中止で対応してください"
                                : undefined
                            }
                            onClick={() => handleDelete(e)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            削除
                          </Button>
                          {e.deletionRequestedAt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === e.id}
                              onClick={() => handleDismiss(e)}
                            >
                              申請を見送る
                            </Button>
                          )}
                          {e.paymentCount > 0 && (
                            <p className="text-xs text-gray-500">支払いあり・削除不可</p>
                          )}
                        </div>
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
