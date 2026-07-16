"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { compressImage } from "@/lib/imageCompress";
import { useDraft } from "@/hooks/useDraft";
import { DraftRestoreBanner } from "@/components/ui/DraftRestoreBanner";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Loader2,
  ImagePlus,
  CheckCircle2,
  Store,
  Globe,
  Instagram,
  Twitter,
  ShieldAlert,
  ExternalLink,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { VENDOR_CATEGORY_LABELS, AREAS, MOTTO_OPTIONS } from "@/lib/constants";

interface DuplicateMatch {
  id: string;
  name: string;
  area: string | null;
  category: string | null;
  imageUrl: string | null;
  claimable: boolean;
}

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

export default function NewStorePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [calendarImageFile, setCalendarImageFile] = useState<File | null>(null);
  const [calendarImagePreview, setCalendarImagePreview] = useState("");
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState("");
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [isVendor, setIsVendor] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // 重複検知 & 引き継ぎ申請
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const draftValue = { formData, selectedTags, selectedAreas, customMotto };
  const { loadDraft, clearDraft, savedAt } = useDraft(
    "store:new",
    draftValue,
    { enabled: !isCheckingRole && isVendor && !isSuccess }
  );

  // 役割チェック
  useEffect(() => {
    const checkRole = async () => {
      if (!session?.user) return;
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const userTypes = data.userTypes || [];
          setIsVendor(userTypes.includes("vendor"));
        }
      } catch (error) {
        console.error("Role check error:", error);
      } finally {
        setIsCheckingRole(false);
      }
    };
    if (session) {
      checkRole();
    }
  }, [session]);

  // 下書き復元（初回マウント時）
  useEffect(() => {
    if (isCheckingRole || !isVendor) return;
    const draft = loadDraft();
    if (draft && draft.data) {
      if (draft.data.formData) setFormData(draft.data.formData);
      if (draft.data.selectedTags) setSelectedTags(draft.data.selectedTags);
      if (draft.data.selectedAreas) setSelectedAreas(draft.data.selectedAreas);
      if (draft.data.customMotto !== undefined) setCustomMotto(draft.data.customMotto);
      setDraftRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingRole, isVendor]);

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftRestored(false);
    setFormData({
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
      calendarImageUrl: "",
      newsText: "",
      newsImageUrl: "",
      messageToOwners: "",
      motto: "",
      vehicleLength: "",
      vehicleWidth: "",
      vehicleHeight: "",
    });
    setSelectedTags([]);
    setSelectedAreas([]);
    setCustomMotto("");
  };

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

    // 送信前に同名店舗の重複チェック（引き継ぎ可能な既存店舗があればモーダル表示）
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/stores/check-duplicate?name=${encodeURIComponent(formData.name)}`
      );
      if (res.ok) {
        const data = await res.json();
        const claimable: DuplicateMatch[] = (data.matches || []).filter(
          (m: DuplicateMatch) => m.claimable
        );
        if (claimable.length > 0) {
          setDuplicateMatches(claimable);
          setClaimMessage("");
          setClaimSubmitted(false);
          setShowDuplicateModal(true);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // 重複チェックに失敗しても登録は続行する
    }

    await createStore();
  };

  // 実際の店舗作成処理（重複チェック通過後 or「別の店舗です」選択後に実行）
  const createStore = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stores", {
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
        setError(data.error || "店舗の登録に失敗しました");
        return;
      }

      // 画像アップロード（圧縮してから個別に送信、失敗しても登録は成功させる）
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

      clearDraft();
      setDraftRestored(false);
      setCreatedStoreId(data.id);
      setUploadFailedCount(failedCount);
      setIsSuccess(true);
    } catch (e) {
      console.error("[store-register]", e);
      const msg = e instanceof Error ? e.message : "不明なエラー";
      setError(`登録中にエラーが発生しました: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // モーダルで「別の店舗です」→ そのまま新規登録
  const handleContinueNewStore = async () => {
    setShowDuplicateModal(false);
    await createStore();
  };

  // モーダルで「私のお店です」→ 引き継ぎ申請
  const handleClaimRequest = async (storeId: string) => {
    setClaimingId(storeId);
    setError("");
    try {
      const res = await fetch("/api/stores/claim-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, message: claimMessage || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "引き継ぎ申請に失敗しました");
        return;
      }
      // 申請成功。下書きは残さず、申請完了表示に切り替える
      clearDraft();
      setDraftRestored(false);
      setClaimSubmitted(true);
    } catch {
      setError("引き継ぎ申請に失敗しました");
    } finally {
      setClaimingId(null);
    }
  };

  // 認証チェック
  if (status === "loading" || isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) {
    router.push("/login?callbackUrl=/stores/new");
    return null;
  }

  // 出店者でない場合はアクセス不可
  if (!isVendor) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto mb-6">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  アクセス権限がありません
                </h2>
                <p className="text-gray-600 mb-6">
                  店舗登録は出店者アカウントのみ利用できます。
                </p>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/mypage")}
                >
                  マイページへ戻る
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
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
                  店舗を登録しました
                </h2>
                <p className="text-gray-600 mb-6">
                  店舗情報が下書きとして登録されました。
                  プレビューで確認後、編集画面から公開できます。
                </p>
                {uploadFailedCount > 0 && (
                  <div className="mb-6 p-4 text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200 text-left">
                    画像のうち {uploadFailedCount} 枚のアップロードに失敗しました。
                    通信が安定している環境で、編集画面から再度アップロードしてください。
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {createdStoreId && (
                    <Button
                      className="rounded-full"
                      asChild
                    >
                      <Link href={`/store/${createdStoreId}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        ページをプレビュー
                      </Link>
                    </Button>
                  )}
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
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                  店舗を登録
                </h1>
                <p className="mt-2 text-gray-600">
                  あなたの店舗・ビジネスの情報を入力してください
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <DraftRestoreBanner
                  show={draftRestored}
                  savedAt={savedAt}
                  onDiscard={handleDiscardDraft}
                />

                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}

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
                      {categoryOptions.map((category) => (
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
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                          <Image
                            src={preview}
                            alt={`店舗画像 ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
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
                        <Image
                          src={calendarImagePreview}
                          alt="出店カレンダー"
                          fill
                          className="object-contain"
                          unoptimized
                        />
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
                        <Image
                          src={newsImagePreview}
                          alt="お知らせ画像"
                          fill
                          className="object-contain"
                          unoptimized
                        />
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

                {savedAt && !isSuccess && (
                  <p className="text-xs text-gray-500 text-right">
                    下書きを自動保存しました（画像を除く）
                  </p>
                )}

                {/* 送信ボタン */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 rounded-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登録中...
                      </>
                    ) : (
                      <>
                        店舗を登録する
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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

      {/* 重複検知 & 引き継ぎ申請モーダル */}
      <Dialog
        open={showDuplicateModal}
        onOpenChange={(open) => {
          // 申請完了後に閉じたらマイページへ
          if (!open && claimSubmitted) {
            setShowDuplicateModal(false);
            router.push("/mypage");
            return;
          }
          setShowDuplicateModal(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {claimSubmitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  引き継ぎ申請を受け付けました
                </DialogTitle>
                <DialogDescription>
                  運営が内容を確認し、あなたのお店であることが確認でき次第、店舗があなたのアカウントに紐付けられます。
                  結果はメールでお知らせします。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  className="rounded-full"
                  onClick={() => {
                    setShowDuplicateModal(false);
                    router.push("/mypage");
                  }}
                >
                  マイページへ
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>この店舗はすでに掲載されています</DialogTitle>
                <DialogDescription>
                  同じ名前の店舗が見つかりました。あなたのお店の場合は「引き継ぎを申請」してください。
                  運営の確認後にあなたのアカウントへ紐付けられます。別のお店の場合はそのまま新規登録できます。
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {duplicateMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200"
                  >
                    <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      {(m.category || m.area) && (
                        <p className="text-xs text-gray-500 truncate">
                          {[m.category, m.area].filter(Boolean).join(" / ")}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full shrink-0"
                      disabled={claimingId !== null}
                      onClick={() => handleClaimRequest(m.id)}
                    >
                      {claimingId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "私のお店です"
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimMessage" className="text-sm">
                  運営への補足（任意）
                </Label>
                <Textarea
                  id="claimMessage"
                  placeholder="例: 公式Instagramは @xxx です。本人であることの確認にご利用ください。"
                  value={claimMessage}
                  onChange={(e) => setClaimMessage(e.target.value)}
                  className="rounded-xl min-h-[70px]"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={claimingId !== null || isLoading}
                  onClick={handleContinueNewStore}
                >
                  別のお店です（新規登録する）
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
