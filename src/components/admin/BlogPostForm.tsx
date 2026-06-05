"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ImagePlus,
  X,
  Save,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { compressImage } from "@/lib/imageCompress";
import BlogEditor from "@/components/admin/BlogEditor";

const NO_CATEGORY = "__none__";

interface BlogPostFormProps {
  postId?: string; // 指定時は編集モード
}

export default function BlogPostForm({ postId }: BlogPostFormProps) {
  const router = useRouter();
  const isEdit = !!postId;
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/blog/${postId}`);
        if (!res.ok) throw new Error();
        const p = await res.json();
        setTitle(p.title ?? "");
        setSlug(p.slug ?? "");
        setExcerpt(p.excerpt ?? "");
        setCoverImage(p.coverImage ?? "");
        setCategory(p.category ?? "");
        setTags(p.tags ?? "");
        setContent(p.content ?? "");
        setIsPublished(!!p.isPublished);
      } catch {
        setError("記事の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const onPickCover = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (e.target) e.target.value = "";
      if (!file) return;
      setUploadingCover(true);
      setError("");
      try {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("type", "blog");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("カバー画像のアップロードに失敗しました");
        const data = await res.json();
        setCoverImage(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "アップロードに失敗しました");
      } finally {
        setUploadingCover(false);
      }
    },
    []
  );

  const save = async (publish?: boolean) => {
    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      isPublished: publish ?? isPublished,
    };
    try {
      const res = await fetch(
        isEdit ? `/api/admin/blog/${postId}` : "/api/admin/blog",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "保存に失敗しました");
      }
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId) return;
    if (!window.confirm("この記事を削除しますか？この操作は取り消せません。")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/blog/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/blog">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {isEdit ? "記事を編集" : "新規記事"}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => save(false)}
              disabled={saving || deleting}
              className="rounded-full"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              下書き保存
            </Button>
            <Button
              onClick={() => save(true)}
              disabled={saving || deleting}
              className="rounded-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isPublished ? "更新して公開" : "公開する"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
        )}

        {isEdit && isPublished && slug && (
          <Link
            href={`/blog/${slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            公開ページを開く
          </Link>
        )}

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="記事のタイトル"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ（URL）</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="空欄ならタイトルから自動生成"
              />
              <p className="text-xs text-gray-500">
                公開URL: /blog/{slug || "（自動生成）"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <Select
                  value={category || NO_CATEGORY}
                  onValueChange={(v) => setCategory(v === NO_CATEGORY ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>なし</SelectItem>
                    {BLOG_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">タグ（カンマ区切り）</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例: キッチンカー, 出店, 東京"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">概要文</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="一覧やSNSシェアで表示される短い説明（任意）"
                rows={2}
              />
            </div>

            {/* カバー画像 */}
            <div className="space-y-2">
              <Label>カバー画像</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={onPickCover}
                className="hidden"
              />
              {coverImage ? (
                <div className="relative w-full max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="カバー画像"
                    className="w-full aspect-video object-cover rounded-xl border"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImage("")}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    title="削除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploadingCover ? (
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600">クリックして画像を選択</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 本文エディタ */}
        <div className="space-y-2">
          <Label>本文</Label>
          <BlogEditor value={content} onChange={setContent} />
        </div>

        {isEdit && (
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              記事を削除
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
