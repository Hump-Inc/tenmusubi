"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VerificationRequest {
  id: string;
  userId: string;
  documentType: string;
  hasDocument: boolean;
  status: string;
  note?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
  profile?: {
    displayName: string;
    category?: string;
  };
}

const statusLabels: Record<string, string> = {
  pending: "審査待ち",
  approved: "承認済み",
  rejected: "却下",
};

const documentTypeLabels: Record<string, string> = {
  business_license: "営業許可証",
  id_card: "身分証明書",
  certificate: "資格証明書",
  other: "その他",
};

export default function AdminVerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState("");

  // Detail dialog
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Action dialog
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionTarget, setActionTarget] = useState<VerificationRequest | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRequests();
    }
  }, [status]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/verification");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "データの取得に失敗しました");
        return;
      }
      setRequests(data);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;

    setIsProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/verification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: actionTarget.id,
          action: actionType,
          note: actionNote || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "処理に失敗しました");
        return;
      }

      setActionType(null);
      setActionTarget(null);
      setActionNote("");
      fetchRequests();
    } catch {
      setError("処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (request: VerificationRequest, type: "approve" | "reject") => {
    setActionTarget(request);
    setActionType(type);
    setActionNote("");
  };

  // Filter
  const filteredRequests = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  // Stats
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">本人確認管理</h1>
              <p className="text-sm text-gray-600">管理者ダッシュボード</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                審査待ち
              </CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                承認済み
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                却下
              </CardTitle>
              <XCircle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{rejectedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>本人確認申請一覧</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">審査待ち</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="rejected">却下</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <ShieldCheck className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-4 text-gray-500">
                  {filter === "pending"
                    ? "審査待ちの申請はありません"
                    : "本人確認の申請はありません"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>書類種別</TableHead>
                    <TableHead>申請日</TableHead>
                    <TableHead className="w-[100px]">ステータス</TableHead>
                    <TableHead className="w-[160px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={req.user?.image || ""} />
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                              {req.profile?.displayName?.[0] || req.user?.name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {req.profile?.displayName || req.user?.name || "名前未設定"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {req.user?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {documentTypeLabels[req.documentType] || req.documentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(req.submittedAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "approved"
                              ? "default"
                              : req.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="rounded-full"
                        >
                          {statusLabels[req.status] || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedRequest(req);
                              setDetailOpen(true);
                            }}
                          >
                            詳細
                          </Button>
                          {req.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-green-600 hover:text-green-700"
                                onClick={() => openActionDialog(req, "approve")}
                              >
                                承認
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-500 hover:text-red-600"
                                onClick={() => openActionDialog(req, "reject")}
                              >
                                却下
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>本人確認申請の詳細</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedRequest.user?.image || ""} />
                  <AvatarFallback className="bg-gray-100 text-gray-600">
                    {selectedRequest.profile?.displayName?.[0] || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-gray-900">
                    {selectedRequest.profile?.displayName || selectedRequest.user?.name || "名前未設定"}
                  </p>
                  <p className="text-sm text-gray-600">{selectedRequest.user?.email}</p>
                  {selectedRequest.profile?.category && (
                    <Badge variant="outline" className="rounded-full text-xs mt-1">
                      {selectedRequest.profile.category}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">書類種別</span>
                  <span className="text-sm font-medium">
                    {documentTypeLabels[selectedRequest.documentType] || selectedRequest.documentType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">申請日</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedRequest.submittedAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ステータス</span>
                  <Badge
                    variant={
                      selectedRequest.status === "approved"
                        ? "default"
                        : selectedRequest.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                    className="rounded-full"
                  >
                    {statusLabels[selectedRequest.status] || selectedRequest.status}
                  </Badge>
                </div>
                {selectedRequest.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">審査日</span>
                    <span className="text-sm font-medium">
                      {new Date(selectedRequest.reviewedAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                )}
                {selectedRequest.note && (
                  <div>
                    <span className="text-sm text-gray-600">備考</span>
                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded">
                      {selectedRequest.note}
                    </p>
                  </div>
                )}
              </div>

              {selectedRequest.hasDocument && (
                <div>
                  <Label className="text-sm text-gray-600">提出書類</Label>
                  <a
                    href={`/api/admin/verification/${selectedRequest.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    書類を確認する
                  </a>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setDetailOpen(false);
                      openActionDialog(selectedRequest, "approve");
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    承認
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      setDetailOpen(false);
                      openActionDialog(selectedRequest, "reject");
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    却下
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <AlertDialog
        open={actionType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionType(null);
            setActionTarget(null);
            setActionNote("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "本人確認を承認" : "本人確認を却下"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.profile?.displayName || actionTarget?.user?.name || "ユーザー"}
              さんの本人確認申請を
              {actionType === "approve" ? "承認" : "却下"}しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="action-note" className="text-sm">
              備考（任意）
            </Label>
            <Textarea
              id="action-note"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={
                actionType === "reject"
                  ? "却下理由を入力..."
                  : "備考を入力..."
              }
              rows={3}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isProcessing}
              className={
                actionType === "approve"
                  ? ""
                  : "bg-red-500 hover:bg-red-600"
              }
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "承認する" : "却下する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
