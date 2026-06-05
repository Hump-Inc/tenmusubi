"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlogPostLite {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function AdminBlogListPage() {
  const [posts, setPosts] = useState<BlogPostLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blog");
      if (!res.ok) throw new Error();
      setPosts(await res.json());
    } catch {
      setError("記事一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const togglePublish = async (post: BlogPostLite) => {
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, isPublished: updated.isPublished, publishedAt: updated.publishedAt }
            : p
        )
      );
    } catch {
      setError("公開状態の更新に失敗しました");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (post: BlogPostLite) => {
    if (!window.confirm(`「${post.title}」を削除しますか？`)) return;
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      setError("削除に失敗しました");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
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
                  <h1 className="text-xl font-bold text-gray-900">ブログ管理</h1>
                  <p className="text-sm text-gray-600">運営からのお知らせ・記事</p>
                </div>
              </div>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/admin/blog/new">
                <Plus className="h-4 w-4 mr-2" />
                新規記事
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <FileText className="h-10 w-10 text-gray-300" />
              <p className="text-gray-600">まだ記事がありません</p>
              <Button asChild className="rounded-full mt-2">
                <Link href="/admin/blog/new">
                  <Plus className="h-4 w-4 mr-2" />
                  最初の記事を書く
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* サムネ */}
                  <div className="h-16 w-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                    {post.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-6 w-6 text-gray-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.isPublished ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          公開中
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          下書き
                        </Badge>
                      )}
                      {post.category && (
                        <Badge variant="outline" className="text-gray-600">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 truncate mt-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {post.isPublished
                        ? `公開: ${formatDate(post.publishedAt)}`
                        : `更新: ${formatDate(post.updatedAt)}`}
                      {"　/blog/"}
                      {post.slug}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {post.isPublished && (
                      <Button variant="ghost" size="icon" asChild title="公開ページ">
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePublish(post)}
                      disabled={busyId === post.id}
                      title={post.isPublished ? "非公開にする" : "公開する"}
                    >
                      {busyId === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : post.isPublished ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="編集">
                      <Link href={`/admin/blog/${post.id}/edit`}>
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post)}
                      disabled={busyId === post.id}
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
