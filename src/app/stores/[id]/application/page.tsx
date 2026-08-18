"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Truck,
  Zap,
  ClipboardList,
  Building2,
  Save,
  CheckCircle2,
  Pencil,
  Share2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DocumentsSection,
  type ApplicationDocumentDto,
} from "@/components/application/DocumentsSection";
import { MenuSection, type MenuItemDto } from "@/components/application/MenuSection";
import {
  VEHICLE_TYPES,
  FIRE_TYPES,
  WATER_TANK_PRESETS,
  WEEKDAYS,
  ALL_PREFECTURES,
} from "@/lib/constants";

interface FormState {
  phone: string;
  contactEmail: string;
  openedOn: string;
  appeal: string;
  vehicleType: string;
  vehicleLength: string;
  vehicleWidth: string;
  vehicleHeight: string;
  vehicleWeightKg: string;
  plateNumber: string;
  plateNumberPublic: boolean;
  powerWatt: string;
  hasGenerator: boolean;
  generatorModel: string;
  generatorNoiseDb: string;
  usesFire: boolean;
  fireType: string;
  waterTankLiter: string;
  minSpaceWidthM: string;
  minSpaceDepthM: string;
  maxServingsPerHour: string;
  secondsPerServing: string;
  hasPrepKitchen: boolean;
  prepKitchenNote: string;
}

const EMPTY_FORM: FormState = {
  phone: "",
  contactEmail: "",
  openedOn: "",
  appeal: "",
  vehicleType: "",
  vehicleLength: "",
  vehicleWidth: "",
  vehicleHeight: "",
  vehicleWeightKg: "",
  plateNumber: "",
  plateNumberPublic: false,
  powerWatt: "",
  hasGenerator: false,
  generatorModel: "",
  generatorNoiseDb: "",
  usesFire: false,
  fireType: "",
  waterTankLiter: "",
  minSpaceWidthM: "",
  minSpaceDepthM: "",
  maxServingsPerHour: "",
  secondsPerServing: "",
  hasPrepKitchen: false,
  prepKitchenNote: "",
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default function StoreApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [documents, setDocuments] = useState<ApplicationDocumentDto[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stores/${id}/application`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }

      setStoreName(data.store.name);
      setStoreCategory(data.store.category);

      const p = data.profile;
      setForm({
        phone: str(p?.phone),
        contactEmail: str(p?.contactEmail),
        openedOn: str(p?.openedOn),
        appeal: str(p?.appeal),
        vehicleType: str(p?.vehicleType),
        vehicleLength: str(data.store.vehicleLength),
        vehicleWidth: str(data.store.vehicleWidth),
        vehicleHeight: str(data.store.vehicleHeight),
        vehicleWeightKg: str(p?.vehicleWeightKg),
        plateNumber: str(p?.plateNumber),
        plateNumberPublic: p?.plateNumberPublic ?? false,
        powerWatt: str(p?.powerWatt),
        hasGenerator: p?.hasGenerator ?? false,
        generatorModel: str(p?.generatorModel),
        generatorNoiseDb: str(p?.generatorNoiseDb),
        usesFire: p?.usesFire ?? false,
        fireType: str(p?.fireType),
        waterTankLiter: str(p?.waterTankLiter),
        minSpaceWidthM: str(p?.minSpaceWidthM),
        minSpaceDepthM: str(p?.minSpaceDepthM),
        maxServingsPerHour: str(p?.maxServingsPerHour),
        secondsPerServing: str(p?.secondsPerServing),
        hasPrepKitchen: p?.hasPrepKitchen ?? false,
        prepKitchenNote: str(p?.prepKitchenNote),
      });

      const parseJsonArray = (value: string | null | undefined): string[] => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      setSelectedDays(parseJsonArray(p?.availableDays));
      setSelectedAreas(parseJsonArray(data.store.availableAreas));
      setDocuments(data.documents ?? []);
      setMenuItems(data.menuItems ?? []);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/stores/${id}/application`);
      return;
    }
    if (status === "authenticated") fetchData();
  }, [status, router, id, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/stores/${id}/application`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          availableDays: selectedDays,
          availableAreas: selectedAreas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }
      setSavedAt(new Date());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) return null;

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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">出店申込情報</h1>
            <p className="text-sm text-gray-600">
              ここに一度登録しておくと、主催者に送る共有URLと申込書をワンクリックで出せます。
              主催者ごとに書類を作り直す必要はありません。
            </p>
          </div>

          {savedAt && (
            <Card className="rounded-2xl border-0 shadow-sm bg-green-50 mb-6">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800 flex-1">保存しました。</p>
                <Button size="sm" variant="outline" className="rounded-full" asChild>
                  <Link href={`/stores/${id}/share-links`}>
                    <Share2 className="h-4 w-4 mr-1" />
                    共有リンクへ
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {/* 店舗情報は店舗編集画面が唯一の編集場所。ここでは参照のみ。 */}
          <Card className="rounded-2xl border-0 shadow-sm mb-6">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-1">屋号・業種</p>
                <p className="font-medium text-gray-900 truncate">{storeName}</p>
                <p className="text-sm text-gray-600">{storeCategory || "業種未設定"}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full shrink-0" asChild>
                <Link href={`/stores/${id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  店舗情報を編集
                </Link>
              </Button>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  基本情報
                </CardTitle>
                <CardDescription>主催者への連絡先として申込書に載ります</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="例: 090-1234-5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">連絡先メール</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => update("contactEmail", e.target.value)}
                      placeholder="未入力なら登録メールを使います"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openedOn">開業年月</Label>
                  <Input
                    id="openedOn"
                    type="month"
                    value={form.openedOn}
                    onChange={(e) => update("openedOn", e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appeal">自己PR</Label>
                  <Textarea
                    id="appeal"
                    value={form.appeal}
                    onChange={(e) => update("appeal", e.target.value.slice(0, 2000))}
                    rows={6}
                    placeholder="どんな出店をしてきたか、主催者に安心してもらえる材料を書いてください"
                  />
                  <p className="text-xs text-gray-500 text-right">{form.appeal.length} / 2000</p>
                </div>
              </CardContent>
            </Card>

            {/* 車両情報 */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  車両情報
                </CardTitle>
                <CardDescription>主催者が最初に確認する項目です</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>車両種別</Label>
                  <Select
                    value={form.vehicleType || undefined}
                    onValueChange={(v) => update("vehicleType", v)}
                  >
                    <SelectTrigger className="max-w-[240px]">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ["vehicleLength", "全長", "450"],
                      ["vehicleWidth", "全幅", "190"],
                      ["vehicleHeight", "全高", "280"],
                    ] as const
                  ).map(([key, label, ph]) => (
                    <div className="space-y-2" key={key}>
                      <Label htmlFor={key}>{label}</Label>
                      <div className="relative">
                        <Input
                          id={key}
                          type="number"
                          min={0}
                          value={form[key]}
                          onChange={(e) => update(key, e.target.value)}
                          placeholder={ph}
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          cm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 max-w-[240px]">
                  <Label htmlFor="vehicleWeightKg">車両重量</Label>
                  <div className="relative">
                    <Input
                      id="vehicleWeightKg"
                      type="number"
                      min={0}
                      value={form.vehicleWeightKg}
                      onChange={(e) => update("vehicleWeightKg", e.target.value)}
                      placeholder="例: 1200"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      kg
                    </span>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="plateNumber">ナンバープレート番号</Label>
                    <Input
                      id="plateNumber"
                      value={form.plateNumber}
                      onChange={(e) => update("plateNumber", e.target.value)}
                      placeholder="例: 品川 500 あ 12-34"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">共有ページに公開する</p>
                      <p className="text-xs text-gray-500">
                        既定は非公開です。オンにすると共有ページと申込書の両方に載ります。
                      </p>
                    </div>
                    <Switch
                      checked={form.plateNumberPublic}
                      onCheckedChange={(v) => update("plateNumberPublic", v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 設備・インフラ要件 */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  設備・インフラ要件
                </CardTitle>
                <CardDescription>主催者が受け入れ可否を判断する箇所です</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2 max-w-[240px]">
                  <Label htmlFor="powerWatt">必要電源</Label>
                  <div className="relative">
                    <Input
                      id="powerWatt"
                      type="number"
                      min={0}
                      value={form.powerWatt}
                      onChange={(e) => update("powerWatt", e.target.value)}
                      placeholder="例: 1500"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      W
                    </span>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-gray-900">発電機を使用する</p>
                    <Switch
                      checked={form.hasGenerator}
                      onCheckedChange={(v) => update("hasGenerator", v)}
                    />
                  </div>
                  {form.hasGenerator && (
                    <div className="grid sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="generatorModel">型番</Label>
                        <Input
                          id="generatorModel"
                          value={form.generatorModel}
                          onChange={(e) => update("generatorModel", e.target.value)}
                          placeholder="例: EU18i"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="generatorNoiseDb">騒音値</Label>
                        <div className="relative">
                          <Input
                            id="generatorNoiseDb"
                            type="number"
                            min={0}
                            value={form.generatorNoiseDb}
                            onChange={(e) => update("generatorNoiseDb", e.target.value)}
                            placeholder="例: 57"
                            className="pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            dB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-gray-900">火気を使用する</p>
                    <Switch
                      checked={form.usesFire}
                      onCheckedChange={(v) => update("usesFire", v)}
                    />
                  </div>
                  {form.usesFire && (
                    <div className="space-y-2 pt-1">
                      <Label>種類</Label>
                      <Select
                        value={form.fireType || undefined}
                        onValueChange={(v) => update("fireType", v)}
                      >
                        <SelectTrigger className="max-w-[240px]">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIRE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waterTankLiter">給排水タンク容量</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {WATER_TANK_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => update("waterTankLiter", String(preset))}
                        className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                          form.waterTankLiter === String(preset)
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {preset}L
                      </button>
                    ))}
                    <div className="relative w-[140px]">
                      <Input
                        id="waterTankLiter"
                        type="number"
                        min={0}
                        value={form.waterTankLiter}
                        onChange={(e) => update("waterTankLiter", e.target.value)}
                        placeholder="自由入力"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        L
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>出店に必要な最小スペース</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-[120px]">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={form.minSpaceWidthM}
                        onChange={(e) => update("minSpaceWidthM", e.target.value)}
                        placeholder="間口"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        m
                      </span>
                    </div>
                    <span className="text-gray-400">×</span>
                    <div className="relative w-[120px]">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={form.minSpaceDepthM}
                        onChange={(e) => update("minSpaceDepthM", e.target.value)}
                        placeholder="奥行"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        m
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 営業条件 */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-orange-500" />
                  営業条件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxServingsPerHour">提供可能食数</Label>
                    <div className="relative">
                      <Input
                        id="maxServingsPerHour"
                        type="number"
                        min={0}
                        value={form.maxServingsPerHour}
                        onChange={(e) => update("maxServingsPerHour", e.target.value)}
                        placeholder="例: 80"
                        className="pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        食/時間
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondsPerServing">提供時間の目安</Label>
                    <div className="relative">
                      <Input
                        id="secondsPerServing"
                        type="number"
                        min={0}
                        value={form.secondsPerServing}
                        onChange={(e) => update("secondsPerServing", e.target.value)}
                        placeholder="例: 45"
                        className="pr-14"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        秒/食
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>出店可能曜日</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setSelectedDays((prev) => toggle(prev, d.value))}
                        className={`h-10 w-10 rounded-full border text-sm transition-colors ${
                          selectedDays.includes(d.value)
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>出店可能エリア</Label>
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
                    {ALL_PREFECTURES.map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setSelectedAreas((prev) => toggle(prev, pref))}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          selectedAreas.includes(pref)
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                  {selectedAreas.length > 0 && (
                    <p className="text-xs text-gray-500">{selectedAreas.length}件を選択中</p>
                  )}
                </div>

                <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-gray-900">仕込み場所がある</p>
                    <Switch
                      checked={form.hasPrepKitchen}
                      onCheckedChange={(v) => update("hasPrepKitchen", v)}
                    />
                  </div>
                  {form.hasPrepKitchen && (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="prepKitchenNote">補足</Label>
                      <Input
                        id="prepKitchenNote"
                        value={form.prepKitchenNote}
                        onChange={(e) => update("prepKitchenNote", e.target.value)}
                        placeholder="例: 自社の仕込み場（保健所許可あり）"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <DocumentsSection storeId={id} documents={documents} onChange={setDocuments} />

            <MenuSection storeId={id} items={menuItems} onChange={setMenuItems} />

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存する
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
