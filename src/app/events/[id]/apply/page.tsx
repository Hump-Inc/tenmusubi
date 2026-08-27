"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Send,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Store as StoreIcon,
  CheckCircle2,
  Flame,
  Coins,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIRE_TYPES } from "@/lib/constants";

interface StoreOption {
  id: string;
  name: string;
  category: string | null;
  vehicleLength: number | null;
  vehicleWidth: number | null;
  vehicleHeight: number | null;
  hasApplicationProfile: boolean;
  powerWatt: number | null;
  usesFire: boolean;
}

/**
 * この募集にだけ効く出店内容。イベントごとにメニューも火気の台数も変わるので、
 * 登録済みの出店申込情報を初期値にして、ここで直したものを主催者に渡す
 * （2026-08-27 MTG）。直しても登録情報そのものは書き換えない。
 */
interface EventPlan {
  usesFire: boolean;
  fireType: string;
  fireApplianceCount: string;
  hasGenerator: boolean;
  powerWatt: string;
  maxServingsPerHour: string;
  minSpaceWidthM: string;
  minSpaceDepthM: string;
  menuItemIds: string[];
}

interface MenuOption {
  id: string;
  name: string;
  price: number | null;
}

const EMPTY_PLAN: EventPlan = {
  usesFire: false,
  fireType: "",
  fireApplianceCount: "",
  hasGenerator: false,
  powerWatt: "",
  maxServingsPerHour: "",
  minSpaceWidthM: "",
  minSpaceDepthM: "",
  menuItemIds: [],
};

interface FeeTier {
  id: string;
  label: string | null;
  fee: number;
  note: string | null;
  slots: number | null;
  widthM: number | null;
  depthM: number | null;
}

interface EventInfo {
  id: string;
  title: string;
  venueName: string;
  area: string;
  exhibitFee: number;
  feeTiers: FeeTier[];
  organizer: { orgName: string };
}

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<EventPlan>(EMPTY_PLAN);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  // 区画ごとに金額が違う募集では、どれを希望するかを選んでもらう
  const [feeTierId, setFeeTierId] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventRes, storesRes] = await Promise.all([
        fetch(`/api/events/${id}`),
        fetch("/api/stores/my"),
      ]);
      const eventData = await eventRes.json();
      if (!eventRes.ok) {
        setError(eventData.error || "募集が見つかりません");
        return;
      }
      setEvent(eventData.event);
      const tiers: FeeTier[] = eventData.event?.feeTiers ?? [];
      if (tiers.length === 1) setFeeTierId(tiers[0].id);

      const storesData = await storesRes.json();
      const list: StoreOption[] = (storesData.stores || storesData || []).map(
        (s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          category: (s.category as string) ?? null,
          vehicleLength: (s.vehicleLength as number) ?? null,
          vehicleWidth: (s.vehicleWidth as number) ?? null,
          vehicleHeight: (s.vehicleHeight as number) ?? null,
          hasApplicationProfile: !!s.applicationProfile,
          powerWatt:
            ((s.applicationProfile as Record<string, unknown>)?.powerWatt as number) ?? null,
          usesFire:
            ((s.applicationProfile as Record<string, unknown>)?.usesFire as boolean) ?? false,
        })
      );
      setStores(list);
      if (list.length === 1) setSelectedStoreId(list[0].id);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // 店舗を選び直すたびに、その店舗の登録内容を初期値として読み込む
  useEffect(() => {
    if (!selectedStoreId) {
      setPlan(EMPTY_PLAN);
      setMenuOptions([]);
      return;
    }
    let cancelled = false;
    setIsLoadingPlan(true);
    fetch(`/api/stores/${selectedStoreId}/application`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const p = data.profile ?? {};
        const menu: MenuOption[] = (data.menuItems ?? []).map(
          (m: { id: string; name: string; price: number | null }) => ({
            id: m.id,
            name: m.name,
            price: m.price ?? null,
          })
        );
        const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
        setMenuOptions(menu);
        setPlan({
          usesFire: p.usesFire ?? false,
          fireType: str(p.fireType),
          fireApplianceCount: str(p.fireApplianceCount),
          hasGenerator: p.hasGenerator ?? false,
          powerWatt: str(p.powerWatt),
          maxServingsPerHour: str(p.maxServingsPerHour),
          minSpaceWidthM: str(p.minSpaceWidthM),
          minSpaceDepthM: str(p.minSpaceDepthM),
          // 既定は登録済みのメニュー全部。外したいものだけ外してもらう。
          menuItemIds: menu.map((m) => m.id),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingPlan(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStoreId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/events/${id}/apply`);
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, id, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      setError("応募する店舗を選んでください");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${id}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          message,
          feeTierId,
          overrides: {
            usesFire: plan.usesFire,
            fireType: plan.usesFire ? plan.fireType : null,
            fireApplianceCount: plan.usesFire ? plan.fireApplianceCount : null,
            hasGenerator: plan.hasGenerator,
            powerWatt: plan.powerWatt,
            maxServingsPerHour: plan.maxServingsPerHour,
            minSpaceWidthM: plan.minSpaceWidthM,
            minSpaceDepthM: plan.minSpaceDepthM,
            menuItemIds: plan.menuItemIds,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "応募に失敗しました");
        return;
      }
      router.push("/events/applications?applied=1");
      router.refresh();
    } catch {
      setError("応募に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

  const selected = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href={`/events/${id}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            募集ページに戻る
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">この募集に応募する</h1>
          {event && (
            <p className="text-sm text-gray-600 mb-6">
              {event.title}（主催 {event.organizer.orgName}）
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {stores.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">先に店舗の登録が必要です</p>
                  <p className="text-sm text-gray-600 mt-1">
                    応募には、出店する店舗の情報が必要です。
                  </p>
                  <Button className="rounded-full mt-4" asChild>
                    <Link href="/stores/new">店舗を登録する</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              {/* 店舗の選択 */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <StoreIcon className="h-5 w-5 text-orange-500" />
                    応募する店舗
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStoreId(s.id)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
                        selectedStoreId === s.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {s.category || "業種未設定"}
                          </p>
                        </div>
                        {selectedStoreId === s.id && (
                          <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />
                        )}
                      </div>
                      {!s.hasApplicationProfile && (
                        <p className="mt-2 text-xs text-amber-700">
                          出店申込情報が未登録です。車両や電源の条件が伝わりません。
                        </p>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* 何が渡るか */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-500" />
                    主催者に伝わる内容
                  </CardTitle>
                  <CardDescription>
                    登録済みの出店申込情報から自動で送られます。イベントごとに変わる項目だけ、
                    下の「今回の出店内容」で直せます。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      "店舗紹介・写真・メニュー",
                      "車両サイズ・車種",
                      "必要電源・発電機",
                      "火気の使用",
                      "必要スペース",
                      "提供可能食数",
                      "出店可能曜日",
                    ].map((label) => (
                      <Badge key={label} variant="outline" className="font-normal">
                        {label}
                      </Badge>
                    ))}
                  </div>

                  <div className="rounded-xl bg-green-50 p-4 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        営業許可証などの書類は、この時点では送られません
                      </p>
                      <p className="text-xs text-green-800 mt-1">
                        主催者とやり取りをして、出店者ご自身が「開示する」を選んだ書類だけが相手に見えます。
                        いつでも開示を取り消せます。
                      </p>
                    </div>
                  </div>

                  {selected && !selected.hasApplicationProfile && (
                    <div className="rounded-xl bg-amber-50 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-amber-900">
                          出店申込情報が未登録です
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                          主催者は電源や車両サイズで受け入れ可否を判断します。先に登録しておくと通りやすくなります。
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full mt-3"
                          asChild
                        >
                          <Link href={`/stores/${selected.id}/application`}>
                            出店申込情報を登録する
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 希望する区画。金額が区画ごとに違う募集でだけ聞く。 */}
              {(event?.feeTiers?.length ?? 0) > 1 && (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Coins className="h-5 w-5 text-orange-500" />
                      希望する区画
                    </CardTitle>
                    <CardDescription>
                      区画によって出展料が変わります。希望を選ぶと主催者に伝わります。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {event!.feeTiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setFeeTierId(tier.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                          feeTierId === tier.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-gray-900">
                            {tier.label || "出展料"}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-600">
                            {[
                              tier.widthM || tier.depthM
                                ? `${tier.widthM ?? "—"}m × ${tier.depthM ?? "—"}m`
                                : null,
                              tier.slots !== null ? `${tier.slots}枠` : null,
                              tier.note,
                            ]
                              .filter(Boolean)
                              .join(" ・ ") || "　"}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium text-gray-900 tabular-nums">
                          {tier.fee === 0 ? "無料" : `${tier.fee.toLocaleString()}円`}
                        </span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* この募集にだけ効く出店内容 */}
              {selected?.hasApplicationProfile && (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      今回の出店内容
                    </CardTitle>
                    <CardDescription>
                      登録内容が初期値です。今回だけ違うところを直してください。
                      ここで直しても、登録済みの出店申込情報は変わりません。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {isLoadingPlan ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        登録内容を読み込んでいます
                      </div>
                    ) : (
                      <>
                        {/* 火気 */}
                        <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">火気を使用する</p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                主催者が消防署に出す書類で台数を書きます。正確な数を入れてください。
                              </p>
                            </div>
                            <Switch
                              checked={plan.usesFire}
                              onCheckedChange={(v) => setPlan((p) => ({ ...p, usesFire: v }))}
                            />
                          </div>
                          {plan.usesFire && (
                            <div className="flex flex-wrap gap-4 pt-1">
                              <div className="space-y-2">
                                <Label>種類</Label>
                                <Select
                                  value={plan.fireType || undefined}
                                  onValueChange={(v) => setPlan((p) => ({ ...p, fireType: v }))}
                                >
                                  <SelectTrigger className="w-[220px] bg-white">
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
                              <div className="space-y-2">
                                <Label htmlFor="planFireCount">台数</Label>
                                <div className="relative w-[130px]">
                                  <Input
                                    id="planFireCount"
                                    type="number"
                                    min={0}
                                    value={plan.fireApplianceCount}
                                    onChange={(e) =>
                                      setPlan((p) => ({ ...p, fireApplianceCount: e.target.value }))
                                    }
                                    placeholder="例: 2"
                                    className="bg-white pr-10"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    台
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 電源・発電機 */}
                        <div className="space-y-3 rounded-xl bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-medium text-gray-900">発電機を持ち込む</p>
                            <Switch
                              checked={plan.hasGenerator}
                              onCheckedChange={(v) => setPlan((p) => ({ ...p, hasGenerator: v }))}
                            />
                          </div>
                          <div className="space-y-2 pt-1">
                            <Label htmlFor="planPowerWatt">必要電源</Label>
                            <div className="relative w-[160px]">
                              <Input
                                id="planPowerWatt"
                                type="number"
                                min={0}
                                value={plan.powerWatt}
                                onChange={(e) =>
                                  setPlan((p) => ({ ...p, powerWatt: e.target.value }))
                                }
                                placeholder="例: 1500"
                                className="bg-white pr-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                W
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 提供食数・必要スペース */}
                        <div className="flex flex-wrap gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="planServings">提供できる数</Label>
                            <div className="relative w-[180px]">
                              <Input
                                id="planServings"
                                type="number"
                                min={0}
                                value={plan.maxServingsPerHour}
                                onChange={(e) =>
                                  setPlan((p) => ({ ...p, maxServingsPerHour: e.target.value }))
                                }
                                placeholder="例: 60"
                                className="pr-16"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                食/時
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>必要スペース</Label>
                            <div className="flex items-center gap-2">
                              <div className="relative w-[110px]">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={plan.minSpaceWidthM}
                                  onChange={(e) =>
                                    setPlan((p) => ({ ...p, minSpaceWidthM: e.target.value }))
                                  }
                                  placeholder="間口"
                                  className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                  m
                                </span>
                              </div>
                              <span className="text-gray-400">×</span>
                              <div className="relative w-[110px]">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={plan.minSpaceDepthM}
                                  onChange={(e) =>
                                    setPlan((p) => ({ ...p, minSpaceDepthM: e.target.value }))
                                  }
                                  placeholder="奥行"
                                  className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                  m
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* メニュー */}
                        {menuOptions.length > 0 && (
                          <div className="space-y-2">
                            <Label>今回持って行くメニュー</Label>
                            <div className="flex flex-wrap gap-2">
                              {menuOptions.map((m) => {
                                const on = plan.menuItemIds.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() =>
                                      setPlan((p) => ({
                                        ...p,
                                        menuItemIds: on
                                          ? p.menuItemIds.filter((x) => x !== m.id)
                                          : [...p.menuItemIds, m.id],
                                      }))
                                    }
                                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                                      on
                                        ? "border-orange-500 bg-orange-50 text-orange-700"
                                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                    }`}
                                  >
                                    {m.name}
                                    {m.price !== null && (
                                      <span className="ml-1 text-xs">
                                        {m.price.toLocaleString()}円
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-gray-500">
                              メニューを増やすときは
                              <Link
                                href={`/stores/${selectedStoreId}/application`}
                                className="mx-1 underline"
                              >
                                出店申込情報
                              </Link>
                              に登録してください。
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* メッセージ */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">主催者へのひとこと</CardTitle>
                  <CardDescription>任意です。やり取りの最初の投稿になります。</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="sr-only">
                      メッセージ
                    </Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                      rows={5}
                      placeholder="例: 過去に同規模のマルシェへ10回ほど出店しています。搬入は8時から可能です。"
                    />
                    <p className="text-xs text-gray-500 text-right">{message.length} / 1000</p>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={isSubmitting || !selectedStoreId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    応募する
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
