"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compressImage } from "@/lib/imageCompress";

interface StoreLite {
  id: string;
  name: string;
}

interface ImageItem {
  id: string; // ローカル識別子
  file: File;
  previewUrl: string;
  baseName: string;
  order: number; // ファイル名から推定した並び順
  storeId: string | "" ; // "" = 未マッチ/スキップ
  ambiguous: boolean; // 同名店舗が複数で自動判定できない
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const SKIP = "__skip__";

// 拡張子除去
function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

// 末尾の連番サフィックス（_1, -2, (3), （4）, 末尾空白+数字）を分離
function splitOrderSuffix(base: string): { name: string; order: number | null } {
  const m = base.match(/^(.*?)[\s_\-]*[(（]?(\d{1,3})[)）]?\s*$/);
  if (m && m[1].trim() !== "") {
    return { name: m[1].trim(), order: parseInt(m[2], 10) };
  }
  return { name: base.trim(), order: null };
}

// マッチング用の正規化（空白除去・小文字化）
function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/[\s　]+/g, "");
}

let itemCounter = 0;

export default function AdminStoreImagesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<StoreLite[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ uploaded: number; failed: number } | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stores");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStores(
        (data.stores as { id: string; name: string }[]).map((s) => ({ id: s.id, name: s.name }))
      );
    } catch {
      setError("店舗一覧の取得に失敗しました");
    } finally {
      setLoadingStores(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // ファイル名 → 店舗の自動マッチ
  const matchStore = useCallback(
    (baseName: string): { storeId: string; ambiguous: boolean } => {
      const target = normalizeName(baseName);
      const exact = stores.filter((s) => normalizeName(s.name) === target);
      if (exact.length === 1) return { storeId: exact[0].id, ambiguous: false };
      if (exact.length > 1) return { storeId: "", ambiguous: true };
      // 前方一致（ファイル名が店舗名で始まる）で候補が1つなら採用
      const prefix = stores.filter((s) => target.startsWith(normalizeName(s.name)) && s.name.trim() !== "");
      if (prefix.length === 1) return { storeId: prefix[0].id, ambiguous: false };
      if (prefix.length > 1) return { storeId: "", ambiguous: true };
      return { storeId: "", ambiguous: false };
    },
    [stores]
  );

  const addFiles = (files: FileList) => {
    setDone(null);
    setError("");
    const next: ImageItem[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const { name, order } = splitOrderSuffix(stripExtension(file.name));
      const { storeId, ambiguous } = matchStore(name);
      next.push({
        id: `item-${itemCounter++}`,
        file,
        previewUrl: URL.createObjectURL(file),
        baseName: name,
        order: order ?? 0,
        storeId,
        ambiguous,
        status: "pending",
      });
    });
    setItems((prev) => [...prev, ...next]);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setItemStore = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, storeId: value === SKIP ? "" : value, ambiguous: false }
          : it
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const reset = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setDone(null);
    setError("");
  };

  const matchedItems = items.filter((it) => it.storeId);
  const unmatchedCount = items.length - matchedItems.length;

  const handleUpload = async () => {
    if (matchedItems.length === 0) return;
    setUploading(true);
    setError("");

    // 店舗ごとに order 昇順で順次アップロード（同一店舗内の連番を保つ）
    const ordered = [...matchedItems].sort((a, b) =>
      a.storeId === b.storeId ? a.order - b.order : 0
    );

    let uploaded = 0;
    let failed = 0;

    for (const item of ordered) {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "uploading" } : it))
      );
      try {
        const compressed = await compressImage(item.file);
        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("type", "store");
        fd.append("targetId", item.storeId);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "アップロード失敗");
        }
        uploaded++;
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "done" } : it))
        );
      } catch (e) {
        failed++;
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: "error", error: e instanceof Error ? e.message : "失敗" }
              : it
          )
        );
      }
    }

    setUploading(false);
    setDone({ uploaded, failed });
  };

  const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/stores">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">店舗画像の一括アップロード</h1>
                <p className="text-sm text-gray-600">ファイル名で店舗に自動マッチして登録</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {done && (
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-gray-900">{done.uploaded}枚をアップロードしました</p>
                {done.failed > 0 && (
                  <p className="text-sm text-red-600">{done.failed}枚は失敗しました</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使い方 */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-start gap-3">
              <ImagePlus className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium text-gray-900">使い方</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                  <li>ファイル名を <code>店舗名.jpg</code> にすると自動でその店舗にマッチします</li>
                  <li>複数枚は <code>店舗名_1.jpg</code> <code>店舗名_2.jpg</code> のように連番を付与</li>
                  <li>自動マッチしない場合は、各画像の店舗を手動で選べます</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ファイル選択 */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingStores}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-10 flex flex-col items-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loadingStores ? (
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700">画像ファイルを選択（複数可）</span>
              <span className="text-xs text-gray-500">クリックして選択 / 1枚5MBまで</span>
            </button>
          </CardContent>
        </Card>

        {/* プレビュー & マッチ */}
        {items.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  マッチ済み {matchedItems.length}枚
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    未マッチ {unmatchedCount}枚（スキップされます）
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 border rounded-xl p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.previewUrl}
                      alt={it.file.name}
                      className="h-14 w-14 rounded-lg object-cover border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{it.file.name}</p>
                      {it.ambiguous && (
                        <p className="text-xs text-amber-600">同名の店舗が複数あります。手動で選択してください</p>
                      )}
                      {it.status === "done" && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> 完了
                        </p>
                      )}
                      {it.status === "error" && (
                        <p className="text-xs text-red-600">{it.error}</p>
                      )}
                    </div>
                    <Select
                      value={it.storeId || SKIP}
                      onValueChange={(v) => setItemStore(it.id, v)}
                      disabled={uploading}
                    >
                      <SelectTrigger className="w-[180px] shrink-0">
                        <SelectValue placeholder="店舗を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>スキップ</SelectItem>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {it.status === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(it.id)}
                        disabled={uploading}
                        className="shrink-0"
                        title="削除"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {matchedItems.length > 0 && (
                <p className="text-xs text-gray-500">
                  マッチ先: {Array.from(new Set(matchedItems.map((it) => storeName(it.storeId)))).join("、")}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || matchedItems.length === 0}
                  className="rounded-full"
                >
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {matchedItems.length}枚をアップロード
                </Button>
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={uploading}
                  className="rounded-full"
                >
                  クリア
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
