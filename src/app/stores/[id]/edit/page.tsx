"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Loader2,
  ImagePlus,
  CheckCircle2,
  Trash2,
  Store,
  Globe,
  Instagram,
  Twitter,
  X,
  QrCode,
  Download,
  ExternalLink,
  Truck,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { VENDOR_CATEGORY_LABELS, AREAS, MOTTO_OPTIONS } from "@/lib/constants";
import { compressImage } from "@/lib/imageCompress";
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

const categoryOptions = VENDOR_CATEGORY_LABELS;

const tagOptions = [
  "週末出店可",
  "平日出店可",
  "イベント出店可",
  "長期出店可",
  "土日祝のみ",
  "短期出店OK",
  "初出店歓迎",
];

function numToStr(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

// 下書き値が空（"", null, undefined）ならDB本体の値を採用
function pickVehicle(draftVal: unknown, storeVal: unknown): string {
  if (draftVal === undefined || draftVal === null || draftVal === "") {
    return numToStr(storeVal);
  }
  return numToStr(draftVal);
}

interface StoreImageData {
  id: string;
  url: string;
}

interface StoreData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  area?: string;
  tags?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  isActive: boolean;
  draftData?: string;
  images?: StoreImageData[];
  ownerIntro?: string;
  recommendedItems?: string;
  commitment?: string;
  calendarImageUrl?: string;
  availableAreas?: string;
  newsText?: string;
  newsImageUrl?: string;
  messageToOwners?: string;
  motto?: string;
  vehicleLength?: number | null;
  vehicleWidth?: number | null;
  vehicleHeight?: number | null;
}

export default function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    area: "",
    website: "",
    instagram: "",
    twitter: "",
    isActive: true,
    ownerIntro: "",
    recommendedItems: "",
    commitment: "",
    calendarImageUrl: "",
    newsText: "",
    newsImageUrl: "",
    messageToOwners: "",
    motto: "",
    vehicleLength: "",
    vehicleWidth: "",
    vehicleHeight: "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [customMotto, setCustomMotto] = useState("");
  const [existingImages, setExistingImages] = useState<StoreImageData[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // 店舗データを取得（編集画面はオーナー用なので下書き画像も含めて取得）
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/stores/${id}?draft=true`);
        if (!res.ok) {
          setError("店舗が見つかりません");
          return;
        }
        const store: StoreData = await res.json();

        // 下書きがあれば下書きデータをフォームに適用
        const draft = store.draftData ? JSON.parse(store.draftData) : null;
        const d = draft || store; // 下書き優先

        setFormData({
          name: d.name || store.name || "",
          description: d.description ?? store.description ?? "",
          category: d.category ?? store.category ?? "",
          area: d.area ?? store.area ?? "",
          website: d.website ?? store.website ?? "",
          instagram: d.instagram ?? store.instagram ?? "",
          twitter: d.twitter ?? store.twitter ?? "",
          isActive: store.isActive, // 公開状態は常に本体から
          ownerIntro: d.ownerIntro ?? store.ownerIntro ?? "",
          recommendedItems: d.recommendedItems ?? store.recommendedItems ?? "",
          commitment: d.commitment ?? store.commitment ?? "",
          calendarImageUrl: d.calendarImageUrl ?? store.calendarImageUrl ?? "",
          newsText: d.newsText ?? store.newsText ?? "",
          newsImageUrl: d.newsImageUrl ?? store.newsImageUrl ?? "",
          messageToOwners: d.messageToOwners ?? store.messageToOwners ?? "",
          motto: d.motto ?? store.motto ?? "",
          vehicleLength: pickVehicle(d.vehicleLength, store.vehicleLength),
          vehicleWidth: pickVehicle(d.vehicleWidth, store.vehicleWidth),
          vehicleHeight: pickVehicle(d.vehicleHeight, store.vehicleHeight),
        });

        if (draft) {
          setHasDraft(true);
        }

        // 画像を設定
        if (store.images) {
          setExistingImages(store.images);
        }

        // タグをパース
        const tagsSource = d.tags ?? store.tags;
        if (tagsSource) {
          try {
            const parsed = typeof tagsSource === "string" ? JSON.parse(tagsSource) : tagsSource;
            setSelectedTags(parsed);
          } catch {
            setSelectedTags([]);
          }
        }

        // 出店可能エリアをパース
        const areasSource = d.availableAreas ?? store.availableAreas;
        if (areasSource) {
          try {
            const parsed = typeof areasSource === "string" ? JSON.parse(areasSource) : areasSource;
            setSelectedAreas(parsed);
          } catch {
            setSelectedAreas([]);
          }
        }

        // mottoがカスタム入力かチェック
        const mottoVal = d.motto ?? store.motto;
        if (mottoVal && !MOTTO_OPTIONS.includes(mottoVal as typeof MOTTO_OPTIONS[number])) {
          setCustomMotto(mottoVal);
        }
      } catch {
        setError("店舗の読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchStore();
    }
  }, [id, session]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const selectCategory = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const selectMotto = (motto: string) => {
    setFormData((prev) => ({ ...prev, motto: prev.motto === motto ? "" : motto }));
    setCustomMotto("");
  };

  const handleImageUploadField = async (
    file: File,
    fieldName: "calendarImageUrl" | "newsImageUrl"
  ) => {
    try {
      const compressed = await compressImage(file);
      const uploadData = new FormData();
      uploadData.append("file", compressed);
      uploadData.append("type", "store");
      uploadData.append("targetId", id);
      const res = await fetch("/api/upload", { method: "POST", body: uploadData });
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, [fieldName]: data.url }));
      } else {
        setError("画像のアップロードに失敗しました");
      }
    } catch (err) {
      console.error("[upload]", err);
      setError("画像のアップロードに失敗しました");
    }
  };

  const [savingMode, setSavingMode] = useState<"draft" | "publish" | null>(null);

  const saveStore = async (saveMode: "draft" | "publish") => {
    setError("");

    if (!formData.name) {
      setError("店舗名は必須です");
      return;
    }

    setSavingMode(saveMode);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveMode,
          ...formData,
          tags: selectedTags,
          availableAreas: selectedAreas,
          motto: formData.motto || customMotto || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.detail || "店舗の更新に失敗しました");
        console.error("Store update failed:", response.status, data);
        return;
      }

      // 新規画像アップロード（圧縮+個別エラー処理。失敗しても保存自体は成功扱い）
      let failedCount = 0;
      if (newImageFiles.length > 0) {
        for (const file of newImageFiles) {
          try {
            const compressed = await compressImage(file);
            const uploadData = new FormData();
            uploadData.append("file", compressed);
            uploadData.append("type", "store");
            uploadData.append("targetId", id);
            if (saveMode === "draft") {
              uploadData.append("isDraft", "true");
            }
            const res = await fetch("/api/upload", { method: "POST", body: uploadData });
            if (!res.ok) failedCount++;
          } catch (err) {
            console.error("[upload]", err);
            failedCount++;
          }
        }
        setNewImageFiles([]);
        setNewImagePreviews([]);
      }

      if (failedCount > 0) {
        setError(`${failedCount}枚の画像アップロードに失敗しました。通信が安定している環境で再度お試しください。`);
      }
      setIsSuccess(true);
    } catch (err) {
      console.error("Store save error:", err);
      setError("更新中にエラーが発生しました: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStore("publish");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "店舗の削除に失敗しました");
        return;
      }

      router.push("/mypage");
    } catch {
      setError("削除中にエラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const generateQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const res = await fetch(`/api/stores/${id}/qr`);
      if (res.ok) {
        const blob = await res.blob();
        setQrCodeUrl(URL.createObjectURL(blob));
      }
    } catch {
      setError("QRコードの生成に失敗しました");
    } finally {
      setIsLoadingQr(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `checkin-qr-${id}.png`;
    a.click();
  };

  // 認証チェック
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) {
    router.push(`/login?callbackUrl=/stores/${id}/edit`);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Back Button */}
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          {isSuccess ? (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {savingMode === "draft" ? "下書きを保存しました" : "店舗を公開保存しました"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {savingMode === "draft"
                    ? "プレビューで確認後、公開保存するとすべてのユーザーに公開されます。"
                    : "店舗情報が正常に更新されました。"}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    className="rounded-full"
                    asChild
                  >
                    <Link
                      href={savingMode === "draft" ? `/store/${id}?draft=true` : `/store/${id}`}
                      target="_blank"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {savingMode === "draft" ? "下書きをプレビュー" : "公開ページを確認"}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setIsSuccess(false)}
                  >
                    続けて編集する
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => router.push("/mypage")}
                  >
                    マイページへ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    店舗を編集
                  </h1>
                  <p className="mt-2 text-gray-600">
                    店舗の情報を更新してください
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    asChild
                  >
                    <Link href={`/store/${id}?draft=true`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      下書きプレビュー
                    </Link>
                  </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>店舗を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        この操作は取り消せません。店舗に関連するすべてのデータも削除されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            削除中...
                          </>
                        ) : (
                          "削除する"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              </div>

              {hasDraft && (
                <div className="p-4 text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <span>未公開の下書きがあります。現在フォームには下書きの内容が表示されています。</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0 ml-4"
                    asChild
                  >
                    <Link href={`/store/${id}?draft=true`} target="_blank">
                      下書きプレビュー
                    </Link>
                  </Button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}

                {/* 公開設定 */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">公開設定</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">店舗を公開する</p>
                        <p className="text-sm text-gray-600">
                          オフにすると検索結果に表示されなくなります
                        </p>
                      </div>
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, isActive: checked }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 基本情報 */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Store className="h-5 w-5 text-primary" />
                      基本情報
                    </CardTitle>
                    <CardDescription>
                      店舗の基本的な情報を入力してください
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        店舗名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="例: 〇〇キッチンカー"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">店舗紹介</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="店舗の特徴、提供メニュー、こだわりなどをアピールしてください"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="rounded-xl min-h-[120px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 業種カテゴリ */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">業種カテゴリ</CardTitle>
                    <CardDescription>
                      最も当てはまるものを選択してください
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {((categoryOptions as readonly string[]).includes(formData.category) || !formData.category
                        ? categoryOptions
                        : [...categoryOptions, formData.category]
                      ).map((category) => (
                        <Badge
                          key={category}
                          variant={
                            formData.category === category ? "default" : "outline"
                          }
                          className={`cursor-pointer rounded-full px-4 py-2 transition-colors ${
                            formData.category === category
                              ? "bg-primary hover:bg-primary/90"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => selectCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 車両サイズ（キッチンカーのみ） */}
                {formData.category === "キッチンカー" && (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        車両サイズ
                      </CardTitle>
                      <CardDescription>
                        出店可能なスペースの判定に使用されます（任意）
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vehicleLength">全長</Label>
                          <div className="relative">
                            <Input
                              id="vehicleLength"
                              name="vehicleLength"
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="例: 450"
                              value={formData.vehicleLength}
                              onChange={handleInputChange}
                              className="rounded-xl pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                              cm
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicleWidth">全幅</Label>
                          <div className="relative">
                            <Input
                              id="vehicleWidth"
                              name="vehicleWidth"
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="例: 190"
                              value={formData.vehicleWidth}
                              onChange={handleInputChange}
                              className="rounded-xl pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                              cm
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicleHeight">高さ</Label>
                          <div className="relative">
                            <Input
                              id="vehicleHeight"
                              name="vehicleHeight"
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="例: 280"
                              value={formData.vehicleHeight}
                              onChange={handleInputChange}
                              className="rounded-xl pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                              cm
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 出店エリア */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      主な出店エリア
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="area">エリア</Label>
                      <Input
                        id="area"
                        name="area"
                        placeholder="例: 東京都内、神奈川県全域"
                        value={formData.area}
                        onChange={handleInputChange}
                        className="rounded-xl"
                      />
                      <p className="text-xs text-gray-500">
                        出店可能なエリアを記載すると、スペースオーナーに見つけてもらいやすくなります
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* タグ */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">出店スタイル</CardTitle>
                    <CardDescription>
                      該当するものをすべて選択してください
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tagOptions.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            selectedTags.includes(tag) ? "default" : "outline"
                          }
                          className={`cursor-pointer rounded-full px-4 py-2 transition-colors ${
                            selectedTags.includes(tag)
                              ? "bg-gray-900 hover:bg-gray-800"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SNS・ウェブサイト */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">SNS・ウェブサイト</CardTitle>
                    <CardDescription>
                      店舗の情報発信先を登録できます（任意）
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="website" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        ウェブサイト
                      </Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        placeholder="https://example.com"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </Label>
                      <Input
                        id="instagram"
                        name="instagram"
                        placeholder="@username"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        X (Twitter)
                      </Label>
                      <Input
                        id="twitter"
                        name="twitter"
                        placeholder="@username"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        className="rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 画像アップロード */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">店舗画像</CardTitle>
                    <CardDescription>
                      店舗や商品の写真を追加してください（任意・最大5枚）
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {existingImages.map((img) => (
                        <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                          <Image
                            src={img.url}
                            alt="店舗画像"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                            onClick={async () => {
                              try {
                                await fetch(`/api/upload/${img.id}?type=store`, { method: "DELETE" });
                                setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
                              } catch {
                                setError("画像の削除に失敗しました");
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {newImagePreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                          <Image
                            src={preview}
                            alt={`新しい画像 ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                            onClick={() => {
                              setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
                              setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {existingImages.length + newImagePreviews.length < 5 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                          <ImagePlus className="h-8 w-8 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">追加</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setNewImageFiles((prev) => [...prev, file]);
                                setNewImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      JPG, PNG, WebP, GIF（送信時に自動で軽量化されます）
                    </p>
                  </CardContent>
                </Card>

                {/* オーナー・スタッフ紹介 */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">オーナー・スタッフ紹介</CardTitle>
                    <CardDescription>お店のスタッフやオーナーについて紹介してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="ownerIntro"
                      placeholder="例: 店主の〇〇です。地元の食材にこだわった料理を提供しています。"
                      value={formData.ownerIntro}
                      onChange={handleInputChange}
                      className="rounded-xl min-h-[100px]"
                    />
                  </CardContent>
                </Card>

                {/* おすすめ商品 */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">おすすめ商品</CardTitle>
                    <CardDescription>お店のおすすめ商品やメニューを紹介してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="recommendedItems"
                      placeholder="例: 特製ローストビーフ丼、季節のフルーツパフェなど"
                      value={formData.recommendedItems}
                      onChange={handleInputChange}
                      className="rounded-xl min-h-[100px]"
                    />
                  </CardContent>
                </Card>

                {/* こだわりポイント */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">こだわりポイント</CardTitle>
                    <CardDescription>お店のこだわりをアピールしてください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="commitment"
                      placeholder="例: 無添加・無農薬の食材を使用しています"
                      value={formData.commitment}
                      onChange={handleInputChange}
                      className="rounded-xl min-h-[100px]"
                    />
                  </CardContent>
                </Card>

                {/* 出店カレンダー */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">出店カレンダー</CardTitle>
                    <CardDescription>出店スケジュールの画像をアップロードしてください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {formData.calendarImageUrl ? (
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 mb-2">
                        <Image
                          src={formData.calendarImageUrl}
                          alt="出店カレンダー"
                          fill
                          className="object-contain"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                          onClick={() => setFormData((prev) => ({ ...prev, calendarImageUrl: "" }))}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="block aspect-[16/9] max-w-sm rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                        <ImagePlus className="h-8 w-8 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">カレンダー画像を追加</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUploadField(file, "calendarImageUrl");
                          }}
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>

                {/* 出店可能な県 */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      出店可能な県
                    </CardTitle>
                    <CardDescription>出店可能なエリアをすべて選択してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {AREAS.filter((a) => a !== "すべて").map((area) => (
                        <Badge
                          key={area}
                          variant={selectedAreas.includes(area) ? "default" : "outline"}
                          className={`cursor-pointer rounded-full px-4 py-2 transition-colors ${
                            selectedAreas.includes(area)
                              ? "bg-primary hover:bg-primary/90"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => toggleArea(area)}
                        >
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* お知らせ */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">お知らせ</CardTitle>
                    <CardDescription>最新のお知らせやイベント情報を発信しましょう</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      name="newsText"
                      placeholder="例: 今月のイベント出店情報、新メニューのお知らせなど"
                      value={formData.newsText}
                      onChange={handleInputChange}
                      className="rounded-xl min-h-[80px]"
                    />
                    {formData.newsImageUrl ? (
                      <div className="relative aspect-[16/9] max-w-sm rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={formData.newsImageUrl}
                          alt="お知らせ画像"
                          fill
                          className="object-contain"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                          onClick={() => setFormData((prev) => ({ ...prev, newsImageUrl: "" }))}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="block w-fit rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-4 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
                        <ImagePlus className="h-5 w-5 text-gray-400" />
                        <span className="text-xs text-gray-500">お知らせ画像を追加</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUploadField(file, "newsImageUrl");
                          }}
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>

                {/* スペースオーナーへ一言 */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">スペースオーナーへ一言</CardTitle>
                    <CardDescription>スペースオーナーへのメッセージを入力してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="messageToOwners"
                      placeholder="例: お気軽にお声がけください！出店条件のご相談も承ります。"
                      value={formData.messageToOwners}
                      onChange={handleInputChange}
                      className="rounded-xl min-h-[80px]"
                    />
                  </CardContent>
                </Card>

                {/* 出店時に大切にしていること */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">出店時に大切にしていること</CardTitle>
                    <CardDescription>キャッチコピーを選択、または自分で入力してください</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {MOTTO_OPTIONS.map((motto) => (
                        <Badge
                          key={motto}
                          variant={formData.motto === motto ? "default" : "outline"}
                          className={`cursor-pointer rounded-full px-4 py-2 transition-colors ${
                            formData.motto === motto
                              ? "bg-primary hover:bg-primary/90"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => selectMotto(motto)}
                        >
                          {motto}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customMotto">自分で入力</Label>
                      <Input
                        id="customMotto"
                        placeholder="自分のキャッチコピーを入力"
                        value={customMotto}
                        onChange={(e) => {
                          setCustomMotto(e.target.value);
                          setFormData((prev) => ({ ...prev, motto: "" }));
                        }}
                        className="rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* QRコード（チェックイン用） */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-primary" />
                      チェックイン用QRコード
                    </CardTitle>
                    <CardDescription>
                      来店客がスキャンしてチェックインできるQRコードを生成します
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {qrCodeUrl ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative w-48 h-48 bg-white rounded-xl overflow-hidden border">
                          <Image
                            src={qrCodeUrl}
                            alt="チェックインQRコード"
                            fill
                            className="object-contain p-2"
                            unoptimized
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={downloadQrCode}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          ダウンロード
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          このQRコードを店舗に掲示してください。来店客がスキャンするとチェックインできます。
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={generateQrCode}
                          disabled={isLoadingQr}
                        >
                          {isLoadingQr ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4 mr-2" />
                          )}
                          QRコードを生成
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 送信ボタン */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 rounded-full"
                    disabled={isSaving}
                  >
                    {isSaving && savingMode === "publish" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        公開保存中...
                      </>
                    ) : (
                      <>
                        公開保存する
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1 rounded-full"
                    disabled={isSaving}
                    onClick={() => saveStore("draft")}
                  >
                    {isSaving && savingMode === "draft" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        下書き保存中...
                      </>
                    ) : (
                      "下書き保存"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="rounded-full"
                    onClick={() => router.back()}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
