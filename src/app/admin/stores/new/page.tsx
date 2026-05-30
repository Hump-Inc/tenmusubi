"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { compressImage } from "@/lib/imageCompress";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Loader2,
  ImagePlus,
  CheckCircle2,
  Store as StoreIcon,
  Globe,
  Instagram,
  Twitter,
  ExternalLink,
  X,
  Truck,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VENDOR_CATEGORY_LABELS, AREAS, MOTTO_OPTIONS } from "@/lib/constants";

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

export default function AdminNewStorePage() {
  const router = useRouter();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null);
  const [uploadFailedCount, setUploadFailedCount] = useState(0);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    area: "",
    website: "",
    instagram: "",
    twitter: "",
    ownerIntro: "",
    recommendedItems: "",
    commitment: "",
    newsText: "",
    messageToOwners: "",
    motto: "",
    vehicleLength: "",
    vehicleWidth: "",
    vehicleHeight: "",
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [customMotto, setCustomMotto] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [calendarImageFile, setCalendarImageFile] = useState<File | null>(null);
  const [calendarImagePreview, setCalendarImagePreview] = useState("");
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState("");

  // 招待リンク（作成後にこの画面から発行できる）
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteQr, setInviteQr] = useState("");
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name) {
      setError("店舗名は必須です");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: selectedTags,
          availableAreas: selectedAreas,
          motto: formData.motto || customMotto || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "店舗の作成に失敗しました");
        return;
      }

      // 画像アップロード（圧縮してから個別に送信、失敗しても作成は成功させる）
      let failedCount = 0;
      const uploadOne = async (
        file: File,
        targetId: string
      ): Promise<{ ok: true; url: string } | { ok: false }> => {
        try {
          const compressed = await compressImage(file);
          const uploadData = new FormData();
          uploadData.append("file", compressed);
          uploadData.append("type", "store");
          uploadData.append("targetId", targetId);
          const res = await fetch("/api/upload", { method: "POST", body: uploadData });
          if (!res.ok) return { ok: false };
          const result = await res.json();
          return { ok: true, url: result.url };
        } catch (err) {
          console.error("[upload]", err);
          return { ok: false };
        }
      };

      if (imageFiles.length > 0 && data.id) {
        for (const file of imageFiles) {
          const result = await uploadOne(file, data.id);
          if (!result.ok) failedCount++;
        }
      }

      // カレンダー画像・お知らせ画像
      const imageUpdates: Record<string, string> = {};
      for (const [file, field] of [
        [calendarImageFile, "calendarImageUrl"],
        [newsImageFile, "newsImageUrl"],
      ] as const) {
        if (file && data.id) {
          const result = await uploadOne(file, data.id);
          if (result.ok) {
            imageUpdates[field] = result.url;
          } else {
            failedCount++;
          }
        }
      }
      if (Object.keys(imageUpdates).length > 0 && data.id) {
        try {
          await fetch(`/api/stores/${data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(imageUpdates),
          });
        } catch (err) {
          console.error("[store-update]", err);
        }
      }

      setCreatedStoreId(data.id);
      setUploadFailedCount(failedCount);
      setIsSuccess(true);
    } catch (e) {
      console.error("[admin-store-create]", e);
      const msg = e instanceof Error ? e.message : "不明なエラー";
      setError(`作成中にエラーが発生しました: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!createdStoreId) return;
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${createdStoreId}/invite`, {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "招待リンクの発行に失敗しました");
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

  if (status === "loading") {
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
              <Link href="/admin/stores">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <StoreIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">店舗ページを作成</h1>
                <p className="text-sm text-gray-600">管理者として店舗ページを作成します</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {isSuccess ? (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">店舗ページを作成しました</h2>
              <p className="text-gray-600 mb-6">
                非公開（下書き）として作成されました。招待リンクを発行して営業者に渡すと、
                営業者が承認した時点で公開され、アカウントに紐付きます。
              </p>
              {uploadFailedCount > 0 && (
                <div className="mb-6 p-4 text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200 text-left">
                  画像のうち {uploadFailedCount} 枚のアップロードに失敗しました。
                  店舗管理から再度アップロードしてください。
                </div>
              )}

              {/* 招待リンク発行 */}
              {inviteUrl ? (
                <div className="mb-6 text-left space-y-3">
                  {inviteQr && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={inviteQr} alt="招待QRコード" className="h-44 w-44 rounded-lg border" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input value={inviteUrl} readOnly className="text-xs" />
                    <Button variant="outline" size="icon" onClick={handleCopyInvite} title="コピー">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    このリンク/QRを営業者に渡してください（有効期限60日）。
                  </p>
                </div>
              ) : (
                <Button
                  className="rounded-full mb-6"
                  onClick={handleGenerateInvite}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  招待リンクを発行
                </Button>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {createdStoreId && (
                  <Button variant="outline" className="rounded-full" asChild>
                    <Link href={`/store/${createdStoreId}?draft=true`} target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      プレビュー
                    </Link>
                  </Button>
                )}
                <Button className="rounded-full" onClick={() => router.push("/admin/stores")}>
                  店舗一覧へ
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* 基本情報 */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <StoreIcon className="h-5 w-5 text-primary" />
                  基本情報
                </CardTitle>
                <CardDescription>店舗の基本的な情報を入力してください</CardDescription>
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
                <CardDescription>最も当てはまるものを選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((category) => (
                    <Badge
                      key={category}
                      variant={formData.category === category ? "default" : "outline"}
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
                  <CardDescription>出店可能なスペースの判定に使用されます（任意）</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: "vehicleLength", label: "全長", ph: "例: 450" },
                      { id: "vehicleWidth", label: "全幅", ph: "例: 190" },
                      { id: "vehicleHeight", label: "高さ", ph: "例: 280" },
                    ].map((f) => (
                      <div className="space-y-2" key={f.id}>
                        <Label htmlFor={f.id}>{f.label}</Label>
                        <div className="relative">
                          <Input
                            id={f.id}
                            name={f.id}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder={f.ph}
                            value={formData[f.id as keyof typeof formData]}
                            onChange={handleInputChange}
                            className="rounded-xl pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600">
                            cm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 主な出店エリア */}
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
                </div>
              </CardContent>
            </Card>

            {/* 出店スタイル */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">出店スタイル</CardTitle>
                <CardDescription>該当するものをすべて選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
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
                <CardDescription>店舗の情報発信先を登録できます（任意）</CardDescription>
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

            {/* 店舗画像 */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">店舗画像</CardTitle>
                <CardDescription>店舗や商品の写真を追加してください（任意・最大5枚）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <Image src={preview} alt={`店舗画像 ${index + 1}`} fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        onClick={() => {
                          setImageFiles((prev) => prev.filter((_, i) => i !== index));
                          setImagePreviews((prev) => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 5 && (
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
                            setImageFiles((prev) => [...prev, file]);
                            setImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
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
                {calendarImagePreview ? (
                  <div className="relative aspect-[16/9] max-w-sm rounded-xl overflow-hidden bg-gray-100 mb-2">
                    <Image src={calendarImagePreview} alt="出店カレンダー" fill className="object-contain" unoptimized />
                    <button
                      type="button"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      onClick={() => {
                        setCalendarImageFile(null);
                        setCalendarImagePreview("");
                      }}
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
                        if (file) {
                          setCalendarImageFile(file);
                          setCalendarImagePreview(URL.createObjectURL(file));
                        }
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
                {newsImagePreview ? (
                  <div className="relative aspect-[16/9] max-w-sm rounded-xl overflow-hidden bg-gray-100">
                    <Image src={newsImagePreview} alt="お知らせ画像" fill className="object-contain" unoptimized />
                    <button
                      type="button"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      onClick={() => {
                        setNewsImageFile(null);
                        setNewsImagePreview("");
                      }}
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
                        if (file) {
                          setNewsImageFile(file);
                          setNewsImagePreview(URL.createObjectURL(file));
                        }
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

            {/* 送信ボタン */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    店舗ページを作成する
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-full"
                onClick={() => router.push("/admin/stores")}
              >
                キャンセル
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
