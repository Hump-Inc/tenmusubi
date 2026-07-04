"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Calendar,
  Filter,
  UserPlus,
  UserMinus,
  Search,
  LayoutDashboard,
  Link2,
  Copy,
  Check,
  QrCode,
  XCircle,
  Pencil,
  Upload,
  ImagePlus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
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

interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  area: string | null;
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  isActive: boolean;
  ownerId: string | null;
  claimStatus: string | null;
  claimEmail: string | null;
  invitedAt: string | null;
  claimedAt: string | null;
  draftData: string | null;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  userType: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  assigned: number;
  unassigned: number;
}

export default function AdminStoresPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, assigned: 0, unassigned: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStoreId, setAssignStoreId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Delete dialog
  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Invite (claim link) dialog
  const [inviteStore, setInviteStore] = useState<StoreItem | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteQr, setInviteQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stores");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStores(data.stores);
      setStats(data.stats);
    } catch {
      setError("店舗データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStores();
    }
  }, [status, fetchStores]);

  // 店舗データに実際に存在するエリア値の一覧（絞り込み用）
  const areaOptions = Array.from(
    new Set(stores.map((s) => s.area).filter((a): a is string => !!a))
  ).sort((a, b) => a.localeCompare(b, "ja"));

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredStores = stores.filter((s) => {
    // 状態フィルタ
    if (filter === "assigned" && s.ownerId === null) return false;
    if (filter === "unassigned" && s.ownerId !== null) return false;
    if (filter === "active" && !s.isActive) return false;
    if (filter === "inactive" && s.isActive) return false;

    // エリアフィルタ
    if (areaFilter !== "all" && s.area !== areaFilter) return false;

    // 検索ワードフィルタ（店舗名・カテゴリ・エリア・説明・オーナー名/メール）
    if (normalizedQuery) {
      const haystack = [
        s.name,
        s.category,
        s.area,
        s.description,
        s.owner?.name,
        s.owner?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });

  const activeCount = stores.filter((s) => s.isActive).length;
  const inactiveCount = stores.length - activeCount;

  // Search users for assign
  const searchUsers = async (q: string) => {
    setUserQuery(q);
    if (q.length < 1) {
      setUsers([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setSearchingUsers(false);
    }
  };

  // Assign owner
  const handleAssign = async (userId: string) => {
    if (!assignStoreId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/stores/${assignStoreId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error();
      setAssignOpen(false);
      setAssignStoreId(null);
      setUserQuery("");
      setUsers([]);
      fetchStores();
    } catch {
      setError("オーナーの紐付けに失敗しました");
    } finally {
      setAssigning(false);
    }
  };

  // Toggle public / non-public
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const handleToggleActive = async (store: StoreItem) => {
    setTogglingId(store.id);
    try {
      const res = await fetch(`/api/admin/stores/${store.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !store.isActive }),
      });
      if (!res.ok) throw new Error();
      fetchStores();
    } catch {
      setError("公開状態の変更に失敗しました");
    } finally {
      setTogglingId(null);
    }
  };

  // Unassign owner
  const handleUnassign = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/assign`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchStores();
    } catch {
      setError("紐付け解除に失敗しました");
    }
  };

  // Delete store
  const handleDelete = async () => {
    if (!deleteStoreId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/stores/${deleteStoreId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDeleteStoreId(null);
      fetchStores();
    } catch {
      setError("店舗の削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  };

  // Generate / open invite link
  const openInvite = async (store: StoreItem) => {
    setInviteStore(store);
    setInviteUrl("");
    setInviteQr("");
    setCopied(false);
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${store.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "発行に失敗しました");
      }
      const data = await res.json();
      setInviteUrl(data.claimUrl);
      setInviteQr(data.qrDataUrl);
      fetchStores();
    } catch (e) {
      setError(e instanceof Error ? e.message : "招待リンクの発行に失敗しました");
      setInviteStore(null);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Revoke invite
  const handleRevokeInvite = async (storeId: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/invite`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchStores();
    } catch {
      setError("招待の取り消しに失敗しました");
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">店舗管理</h1>
                <p className="text-sm text-gray-600">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">
            {error}
            <button className="ml-4 underline" onClick={() => setError("")}>閉じる</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">全店舗</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.assigned}</p>
              <p className="text-sm text-gray-600">紐付済</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.unassigned}</p>
              <p className="text-sm text-gray-600">未紐付</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
              <p className="text-sm text-gray-600">公開中</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-500">{inactiveCount}</p>
              <p className="text-sm text-gray-600">非公開</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="店舗名・エリア・オーナーで検索"
                className="pl-10"
              />
            </div>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="エリア" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">エリア: すべて</SelectItem>
                {areaOptions.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="assigned">紐付済</SelectItem>
                  <SelectItem value="unassigned">未紐付</SelectItem>
                  <SelectItem value="active">公開中</SelectItem>
                  <SelectItem value="inactive">非公開</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/admin/stores/images">
                <ImagePlus className="h-4 w-4 mr-2" />
                画像一括アップロード
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/admin/stores/import">
                <Upload className="h-4 w-4 mr-2" />
                CSV一括登録
              </Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/admin/stores/new">
                <Plus className="h-4 w-4 mr-2" />
                新規店舗作成
              </Link>
            </Button>
          </div>
        </div>

        {/* Result count */}
        <p className="text-sm text-gray-600 mb-3">
          {filteredStores.length} 件表示
          {filteredStores.length !== stores.length && ` / 全 ${stores.length} 件`}
        </p>

        {/* Table */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店舗名</TableHead>
                <TableHead className="hidden md:table-cell">カテゴリ</TableHead>
                <TableHead className="hidden md:table-cell">エリア</TableHead>
                <TableHead>オーナー</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="hidden md:table-cell">作成日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    <Store className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>店舗がありません</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {store.category || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {store.area || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {store.owner ? (
                        <span className="text-sm">
                          {store.owner.name || store.owner.email}
                        </span>
                      ) : store.claimStatus === "invited" ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                          招待中
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          未割当
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {togglingId === store.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <Switch
                            checked={store.isActive}
                            onCheckedChange={() => handleToggleActive(store)}
                            aria-label="公開状態を切り替え"
                          />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            store.isActive ? "text-blue-700" : "text-gray-500"
                          }`}
                        >
                          {store.isActive ? "公開中" : "非公開"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(store.createdAt).toLocaleDateString("ja-JP")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={store.draftData ? "下書きをプレビュー" : "店舗ページをプレビュー"}
                          asChild
                        >
                          <Link
                            href={
                              store.draftData
                                ? `/store/${store.id}?draft=true`
                                : `/store/${store.id}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye
                              className={`h-4 w-4 ${
                                store.draftData ? "text-purple-600" : "text-gray-600"
                              }`}
                            />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="店舗内容を編集"
                          asChild
                        >
                          <Link href={`/stores/${store.id}/edit`}>
                            <Pencil className="h-4 w-4 text-gray-600" />
                          </Link>
                        </Button>
                        {store.owner ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="紐付け解除"
                            onClick={() => handleUnassign(store.id)}
                          >
                            <UserMinus className="h-4 w-4 text-gray-500" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={store.claimStatus === "invited" ? "招待リンクを再表示" : "招待リンク発行"}
                              onClick={() => openInvite(store)}
                            >
                              <Link2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                            {store.claimStatus === "invited" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="招待を取り消し"
                                onClick={() => handleRevokeInvite(store.id)}
                              >
                                <XCircle className="h-4 w-4 text-amber-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="既存ユーザーを割当"
                              onClick={() => {
                                setAssignStoreId(store.id);
                                setAssignOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 text-blue-500" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="削除"
                          onClick={() => setDeleteStoreId(store.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Assign Owner Dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => {
        setAssignOpen(open);
        if (!open) {
          setAssignStoreId(null);
          setUserQuery("");
          setUsers([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>オーナー割当</DialogTitle>
            <DialogDescription>
              ユーザーを検索して店舗のオーナーとして紐付けます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={userQuery}
                onChange={(e) => searchUsers(e.target.value)}
                placeholder="名前またはメールで検索"
                className="pl-10"
              />
            </div>
            {searchingUsers && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {users.length > 0 && (
              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => handleAssign(user.id)}
                    disabled={assigning}
                  >
                    <div>
                      <p className="font-medium text-sm">{user.name || "名前なし"}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {userQuery.length > 0 && !searchingUsers && users.length === 0 && (
              <p className="text-center text-sm text-gray-600 py-4">
                ユーザーが見つかりません
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog
        open={!!inviteStore}
        onOpenChange={(open) => {
          if (!open) {
            setInviteStore(null);
            setInviteUrl("");
            setInviteQr("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              招待リンク
            </DialogTitle>
            <DialogDescription>
              {inviteStore?.name} のページを営業者に承認してもらうためのリンクです。
              LINEや口頭などでお渡しください。承認すると店舗が公開され、営業者のアカウントに紐付きます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {inviteLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {inviteQr && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={inviteQr} alt="招待QRコード" className="h-48 w-48 rounded-lg border" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input value={inviteUrl} readOnly className="text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyInvite} title="コピー">
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  リンクの有効期限は60日です。再発行すると以前のリンクは無効になります。
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteStore(null)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteStoreId} onOpenChange={(open) => !open && setDeleteStoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>店舗を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。店舗に関連する画像データも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
