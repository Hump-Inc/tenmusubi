"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Loader2,
  ArrowLeft,
  Search,
  Calendar,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Store as StoreIcon,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  userType: string | null;
  isAdmin: boolean;
  emailVerified: string | null;
  createdAt: string;
  _count: { stores: number };
}

const USER_TYPE_LABELS: Record<string, string> = {
  vendor: "出店者",
  owner: "スペースオーナー",
};

function parseUserTypes(userType: string | null): string[] {
  if (!userType) return [];
  try {
    const parsed = JSON.parse(userType);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [userType];
  }
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // 管理者権限の付与/剥奪
  const [pendingToggle, setPendingToggle] = useState<{ user: UserItem; next: boolean } | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const handleConfirmToggleAdmin = async () => {
    if (!pendingToggle) return;
    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/admin/users/${pendingToggle.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: pendingToggle.next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "権限の更新に失敗しました");
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === pendingToggle.user.id ? { ...u, isAdmin: pendingToggle.next } : u
        )
      );
      setPendingToggle(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "権限の更新に失敗しました");
      setPendingToggle(null);
    } finally {
      setSavingAdmin(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchUsers = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      setError("ユーザー一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUsers("");
    }
  }, [status, fetchUsers]);

  // 検索（入力後にデバウンス）
  useEffect(() => {
    if (status !== "authenticated") return;
    const t = setTimeout(() => {
      fetchUsers(query.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [query, status, fetchUsers]);

  const stats = {
    total: users.length,
    vendors: users.filter((u) => parseUserTypes(u.userType).includes("vendor")).length,
    owners: users.filter((u) => parseUserTypes(u.userType).includes("owner")).length,
    admins: users.filter((u) => u.isAdmin).length,
  };

  if (status === "loading" || (isLoading && users.length === 0)) {
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
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">{query ? "検索結果" : "全ユーザー"}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.vendors}</p>
              <p className="text-sm text-gray-600">出店者</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.owners}</p>
              <p className="text-sm text-gray-600">スペースオーナー</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
              <p className="text-sm text-gray-600">管理者</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前またはメールで検索"
            className="pl-10 rounded-full"
          />
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead className="hidden md:table-cell">種別</TableHead>
                <TableHead className="hidden md:table-cell">メール認証</TableHead>
                <TableHead>店舗</TableHead>
                <TableHead className="hidden md:table-cell">登録日</TableHead>
                <TableHead className="text-right">管理者権限</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>ユーザーが見つかりません</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const types = parseUserTypes(user.userType);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {user.image ? (
                              <Image
                                src={user.image}
                                alt={user.name || ""}
                                width={36}
                                height={36}
                                className="object-cover h-full w-full"
                                unoptimized
                              />
                            ) : (
                              <Users className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium truncate">
                                {user.name || "名前なし"}
                              </span>
                              {user.isAdmin && (
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  管理者
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              {user.email || "—"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {types.length > 0 ? (
                            types.map((t) => (
                              <Badge key={t} variant="outline" className="text-gray-700">
                                {USER_TYPE_LABELS[t] || t}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            認証済
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                            <XCircle className="h-4 w-4" />
                            未認証
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <StoreIcon className="h-3.5 w-3.5 text-gray-400" />
                          {user._count.stores}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={user.isAdmin}
                            disabled={user.id === session?.user?.id}
                            onCheckedChange={(next) => setPendingToggle({ user, next })}
                            aria-label="管理者権限を切り替え"
                          />
                          {user.id === session?.user?.id && (
                            <span className="text-xs text-gray-400">(自分)</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* 権限変更の確認 */}
      <AlertDialog open={!!pendingToggle} onOpenChange={(open) => !open && !savingAdmin && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.next ? "管理者権限を付与しますか？" : "管理者権限を解除しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.next ? (
                <>
                  <span className="font-medium">{pendingToggle?.user.name || pendingToggle?.user.email}</span>
                  {" "}に管理者権限を付与します。管理画面の全機能（ユーザー・店舗・本人確認など）にアクセスできるようになります。
                </>
              ) : (
                <>
                  <span className="font-medium">{pendingToggle?.user.name || pendingToggle?.user.email}</span>
                  {" "}の管理者権限を解除します。管理画面にアクセスできなくなります。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingAdmin}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmToggleAdmin();
              }}
              disabled={savingAdmin}
              className={pendingToggle?.next ? "" : "bg-red-600 hover:bg-red-700"}
            >
              {savingAdmin && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pendingToggle?.next ? "付与する" : "解除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
