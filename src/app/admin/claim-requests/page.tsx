"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Loader2,
  ArrowLeft,
  Mail,
  Calendar,
  Filter,
  MapPin,
  Check,
  X,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClaimRequest {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  store: {
    id: string;
    name: string;
    area: string | null;
    category: string | null;
    ownerId: string | null;
    claimStatus: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "審査待ち",
  approved: "承認済み",
  rejected: "却下",
};

export default function AdminClaimRequestsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/claim-requests${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "データの取得に失敗しました");
        return;
      }
      setRequests(data.requests);
      setStats(data.stats);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/claim-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "処理に失敗しました");
        return;
      }
      fetchRequests();
    } catch {
      setError("処理に失敗しました");
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">店舗引き継ぎ申請</h1>
              <p className="text-sm text-gray-600">管理者ダッシュボード</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "審査待ち", value: stats.pending, color: "text-amber-600" },
            { label: "承認済み", value: stats.approved, color: "text-green-600" },
            { label: "却下", value: stats.rejected, color: "text-gray-500" },
            { label: "合計", value: stats.total, color: "text-gray-900" },
          ].map((s) => (
            <Card key={s.label} className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>申請一覧</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="フィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">審査待ち</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="rejected">却下</SelectItem>
                  <SelectItem value="all">すべて</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-4 text-gray-500">該当する申請はありません</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>対象店舗</TableHead>
                    <TableHead>申請者</TableHead>
                    <TableHead>補足</TableHead>
                    <TableHead>申請日時</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="w-[160px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>{r.store.name}</span>
                          <Link
                            href={`/store/${r.store.id}`}
                            target="_blank"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        {(r.store.area || r.store.category) && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            {[r.store.category, r.store.area].filter(Boolean).join(" / ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{r.user.name ?? "（名前未設定）"}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          {r.user.email ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                          {r.message || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Calendar className="h-4 w-4" />
                          {new Date(r.createdAt).toLocaleDateString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "approved"
                              ? "default"
                              : r.status === "rejected"
                              ? "secondary"
                              : "outline"
                          }
                          className={`rounded-full ${
                            r.status === "pending" ? "border-amber-300 text-amber-700" : ""
                          }`}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            {/* 承認 */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="rounded-full h-8 bg-green-600 hover:bg-green-700"
                                  disabled={processingId === r.id}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  承認
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>引き継ぎを承認しますか？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    「{r.store.name}」を {r.user.name ?? r.user.email} さんに紐付けて公開します。
                                    本人確認が取れていることを確認してください。この操作は取り消せません。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReview(r.id, "approve")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    承認する
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            {/* 却下 */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full h-8 text-red-600 hover:text-red-700"
                                  disabled={processingId === r.id}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  却下
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>申請を却下しますか？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    「{r.store.name}」への引き継ぎ申請を却下します。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleReview(r.id, "reject")}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    却下する
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">対応済み</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
