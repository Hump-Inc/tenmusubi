"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Share2,
  Copy,
  Check,
  Eye,
  Plus,
  Ban,
  Lock,
  Clock,
  ExternalLink,
  Inbox,
  Pencil,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ShareLinkDto {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  printCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  hasPassword: boolean;
  _count?: { leads: number };
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

type LinkState = "active" | "revoked" | "expired";

function linkState(link: ShareLinkDto): LinkState {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return "expired";
  return "active";
}

export default function ShareLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [links, setLinks] = useState<ShareLinkDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ShareLinkDto | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const shareUrl = (token: string) => `${origin}/s/${token}`;

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stores/${id}/share-links`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setLinks(data.links);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/stores/${id}/share-links`);
      return;
    }
    if (status === "authenticated") fetchLinks();
  }, [status, router, id, fetchLinks]);

  const create = async () => {
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/stores/${id}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, expiresAt: expiresAt || null, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "発行に失敗しました");
        return;
      }
      setLinks([data.link, ...links]);
      setLabel("");
      setExpiresAt("");
      setPassword("");
      setShowForm(false);
    } catch {
      setError("発行に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  const copy = async (link: ShareLinkDto) => {
    await navigator.clipboard.writeText(shareUrl(link.token));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((prev) => (prev === link.id ? null : prev)), 2000);
  };

  const revoke = async (link: ShareLinkDto) => {
    const res = await fetch(`/api/stores/${id}/share-links/${link.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, revokedAt: new Date().toISOString() } : l))
    );
  };

  const rename = async (link: ShareLinkDto) => {
    const next = window.prompt("送り先の名前", link.label || "");
    if (next === null) return;
    const res = await fetch(`/api/stores/${id}/share-links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: next }),
    });
    if (!res.ok) return;
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, label: next.trim() || null } : l))
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) return null;

  const activeCount = links.filter((l) => linkState(l) === "active").length;
  const totalViews = links.reduce((sum, l) => sum + l.viewCount, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">共有リンク</h1>
            <p className="text-sm text-gray-600">
              主催者ごとにリンクを発行して送ると、
              <strong className="font-medium text-gray-900">
                相手がいつ開いたかが分かります。
              </strong>
              返事が来ない時に、届いていないのか検討中なのかを見分けられます。
            </p>
          </div>

          {links.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">有効なリンク</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">のべ閲覧数</p>
                  <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {/* 発行 */}
          {showForm ? (
            <Card className="rounded-2xl border-0 shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-lg">リンクを発行</CardTitle>
                <CardDescription>
                  送り先ごとに1本ずつ発行すると、どこが見たかを見分けられます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">送り先の名前</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="例: 〇〇マルシェ様"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">有効期限（任意）</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">未指定なら無期限</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">閲覧パスワード（任意）</Label>
                    <Input
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="未指定なら不要"
                    />
                    <p className="text-xs text-gray-500">相手に別途お伝えください</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button className="rounded-full" onClick={create} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        発行中...
                      </>
                    ) : (
                      "発行する"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setShowForm(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button className="rounded-full mb-6" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              リンクを発行する
            </Button>
          )}

          {/* 一覧 */}
          {links.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <Share2 className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  まだリンクがありません。
                  <br />
                  主催者に送るリンクを発行してみてください。
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {links.map((link) => {
                const state = linkState(link);
                return (
                  <li key={link.id}>
                    <Card className="rounded-2xl border-0 shadow-sm">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">
                                {link.label || "（名前なし）"}
                              </p>
                              <button
                                type="button"
                                onClick={() => rename(link)}
                                className="text-gray-400 hover:text-gray-700"
                                aria-label="名前を変更"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(link.createdAt)} 発行
                              {link.expiresAt && ` ・ ${formatDate(link.expiresAt)} まで`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {link.hasPassword && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Lock className="h-3 w-3" />
                                保護
                              </Badge>
                            )}
                            {state === "active" && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                有効
                              </Badge>
                            )}
                            {state === "expired" && (
                              <Badge variant="outline" className="gap-1 text-amber-700">
                                <Clock className="h-3 w-3" />
                                期限切れ
                              </Badge>
                            )}
                            {state === "revoked" && (
                              <Badge variant="outline" className="gap-1 text-gray-500">
                                <Ban className="h-3 w-3" />
                                失効
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 閲覧状況。この機能の価値の中心なので目立たせる。 */}
                        <div className="rounded-xl bg-gray-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Eye
                              className={`h-4 w-4 ${
                                link.viewCount > 0 ? "text-orange-500" : "text-gray-400"
                              }`}
                            />
                            {link.viewCount > 0 ? (
                              <p className="text-sm text-gray-900">
                                <strong className="font-semibold">{link.viewCount}回</strong>
                                閲覧されました
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">まだ開かれていません</p>
                            )}
                          </div>
                          {link.lastViewedAt && (
                            <p className="mt-1 pl-6 text-xs text-gray-500">
                              最終閲覧 {formatDateTime(link.lastViewedAt)}
                            </p>
                          )}
                          {(link.printCount > 0 || (link._count?.leads ?? 0) > 0) && (
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs text-gray-500">
                              {link.printCount > 0 && <span>申込書の印刷 {link.printCount}回</span>}
                              {(link._count?.leads ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-orange-600">
                                  <Inbox className="h-3 w-3" />
                                  スペース相談 {link._count?.leads}件
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {state === "active" && (
                          <>
                            <div className="flex items-center gap-2">
                              <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600">
                                {shareUrl(link.token)}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 rounded-full"
                                onClick={() => copy(link)}
                              >
                                {copiedId === link.id ? (
                                  <>
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                    コピー済み
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-1 h-3.5 w-3.5" />
                                    コピー
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant="ghost" size="sm" className="rounded-full" asChild>
                                <a href={`/s/${link.token}`} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                  開いて確認
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full text-gray-500 hover:text-red-600"
                                onClick={() => setRevokeTarget(link)}
                              >
                                <Ban className="mr-1 h-3.5 w-3.5" />
                                失効させる
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <Footer />

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このリンクを失効させますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{revokeTarget?.label || "名前なし"}」に送ったリンクが開けなくなります。
              相手には「出店者に最新のURLを確認してください」という画面が表示されます。
              閲覧の記録は残ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (revokeTarget) revoke(revokeTarget);
                setRevokeTarget(null);
              }}
            >
              失効させる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
