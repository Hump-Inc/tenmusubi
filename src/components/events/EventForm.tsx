"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Send,
  CalendarDays,
  MapPin,
  Zap,
  Coins,
  ClipboardList,
  Image as ImageIcon,
} from "lucide-react";
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
import { EventImageSection } from "@/components/events/EventImageSection";
import {
  ALL_PREFECTURES,
  VENDOR_CATEGORY_LABELS,
  DOCUMENT_TYPES,
} from "@/lib/constants";

export interface EventFormValues {
  id?: string;
  title: string;
  description: string;
  venueName: string;
  address: string;
  area: string;
  startAt: string;
  endAt: string;
  applicationOpenAt: string;
  applicationCloseAt: string;
  slots: string;
  exhibitFee: string;
  feeNote: string;
  spaceWidthM: string;
  spaceDepthM: string;
  powerAvailable: boolean;
  powerWatt: string;
  waterAvailable: boolean;
  fireAllowed: boolean;
  categories: string[];
  requiredDocuments: string[];
  expectedVisitors: string;
  note: string;
  status: string;
}

export const EMPTY_EVENT: EventFormValues = {
  title: "",
  description: "",
  venueName: "",
  address: "",
  area: "",
  startAt: "",
  endAt: "",
  applicationOpenAt: "",
  applicationCloseAt: "",
  slots: "",
  exhibitFee: "",
  feeNote: "",
  spaceWidthM: "",
  spaceDepthM: "",
  powerAvailable: false,
  powerWatt: "",
  waterAvailable: false,
  fireAllowed: false,
  categories: [],
  requiredDocuments: [],
  expectedVisitors: "",
  note: "",
  status: "draft",
};

/** datetime-local / date の入力値を、ローカル時刻のまま扱うための変換 */
export function toLocalInput(value: string | Date | null | undefined, kind: "datetime" | "date") {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return kind === "date" ? base : `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onToggle(o.value)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            selected.includes(o.value)
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EventForm({
  initial,
  eventId,
}: {
  initial: EventFormValues;
  eventId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<EventFormValues>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<"draft" | "published">("draft");
  const [error, setError] = useState("");

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "categories" | "requiredDocuments", value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));

  // 主催者は開催の2ヶ月前くらいから募集を始めるので、開催日を入れたら既定で埋める
  useEffect(() => {
    if (!form.startAt || form.applicationOpenAt) return;
    const start = new Date(form.startAt);
    if (Number.isNaN(start.getTime())) return;
    const open = new Date(start);
    open.setMonth(open.getMonth() - 2);
    setForm((prev) => ({ ...prev, applicationOpenAt: toLocalInput(open, "date") }));
  }, [form.startAt, form.applicationOpenAt]);

  const save = async (mode: "draft" | "published") => {
    setIsSaving(true);
    setSavingMode(mode);
    setError("");
    try {
      const payload = { ...form, status: mode };
      const res = await fetch(eventId ? `/api/events/${eventId}` : "/api/events", {
        method: eventId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save("published");
      }}
      className="space-y-6"
    >
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* 基本 */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-orange-500" />
            イベントの概要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              イベント名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="例: 秋の〇〇マルシェ"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">イベントの紹介</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value.slice(0, 5000))}
              rows={6}
              placeholder="どんなイベントか、どんな出店者に来てほしいかを書いてください。"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startAt">
                開始日時 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">
                終了日時 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2 max-w-[240px]">
            <Label htmlFor="expectedVisitors">想定来場者数</Label>
            <div className="relative">
              <Input
                id="expectedVisitors"
                type="number"
                min={0}
                value={form.expectedVisitors}
                onChange={(e) => set("expectedVisitors", e.target.value)}
                placeholder="例: 8000"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                人
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会場 */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            会場
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venueName">
              会場名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="venueName"
              value={form.venueName}
              onChange={(e) => set("venueName", e.target.value)}
              placeholder="例: 〇〇公園 中央広場"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              エリア <span className="text-red-500">*</span>
            </Label>
            <Select value={form.area || undefined} onValueChange={(v) => set("area", v)}>
              <SelectTrigger className="max-w-[240px]">
                <SelectValue placeholder="都道府県を選択" />
              </SelectTrigger>
              <SelectContent>
                {ALL_PREFECTURES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="例: 東京都世田谷区〇〇1-2-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* 募集条件 */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-orange-500" />
            募集条件
          </CardTitle>
          <CardDescription>出店者が最初に確認する項目です</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exhibitFee">
                出展料 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="exhibitFee"
                  type="number"
                  min={0}
                  value={form.exhibitFee}
                  onChange={(e) => set("exhibitFee", e.target.value)}
                  placeholder="15000"
                  className="pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  円
                </span>
              </div>
              <p className="text-xs text-gray-500">無料の場合は 0 を入力してください</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeNote">出展料の補足</Label>
              <Input
                id="feeNote"
                value={form.feeNote}
                onChange={(e) => set("feeNote", e.target.value)}
                placeholder="例: +売上の10%"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slots">募集枠数</Label>
              <div className="relative">
                <Input
                  id="slots"
                  type="number"
                  min={0}
                  value={form.slots}
                  onChange={(e) => set("slots", e.target.value)}
                  placeholder="例: 12"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  台
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>1区画のサイズ</Label>
              <div className="flex items-center gap-2">
                <div className="relative w-[100px]">
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.spaceWidthM}
                    onChange={(e) => set("spaceWidthM", e.target.value)}
                    placeholder="間口"
                    className="pr-7"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    m
                  </span>
                </div>
                <span className="text-gray-400">×</span>
                <div className="relative w-[100px]">
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.spaceDepthM}
                    onChange={(e) => set("spaceDepthM", e.target.value)}
                    placeholder="奥行"
                    className="pr-7"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    m
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="applicationOpenAt">募集開始日</Label>
              <Input
                id="applicationOpenAt"
                type="date"
                value={form.applicationOpenAt}
                onChange={(e) => set("applicationOpenAt", e.target.value)}
              />
              <p className="text-xs text-gray-500">開催の2ヶ月前を既定で入れています</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicationCloseAt">募集締切日</Label>
              <Input
                id="applicationCloseAt"
                type="date"
                value={form.applicationCloseAt}
                onChange={(e) => set("applicationCloseAt", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>募集する業種</Label>
            <Chips
              options={VENDOR_CATEGORY_LABELS.map((l) => ({ value: l, label: l }))}
              selected={form.categories}
              onToggle={(v) => toggle("categories", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 会場設備 */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            会場で使える設備
          </CardTitle>
          <CardDescription>ここが合わないと出店できないので、正確に書いてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-gray-900">電源を用意できる</p>
              <Switch
                checked={form.powerAvailable}
                onCheckedChange={(v) => set("powerAvailable", v)}
              />
            </div>
            {form.powerAvailable && (
              <div className="space-y-2 max-w-[240px] pt-1">
                <Label htmlFor="powerWatt">1区画あたりの上限</Label>
                <div className="relative">
                  <Input
                    id="powerWatt"
                    type="number"
                    min={0}
                    value={form.powerWatt}
                    onChange={(e) => set("powerWatt", e.target.value)}
                    placeholder="例: 1500"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    W
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">給排水を使える</p>
            <Switch
              checked={form.waterAvailable}
              onCheckedChange={(v) => set("waterAvailable", v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">火気の使用が可能</p>
            <Switch checked={form.fireAllowed} onCheckedChange={(v) => set("fireAllowed", v)} />
          </div>
        </CardContent>
      </Card>

      {/* 写真。保存前は募集が存在しないので、編集時だけ出す。 */}
      {eventId ? (
        <EventImageSection eventId={eventId} />
      ) : (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-500" />
              写真
            </CardTitle>
            <CardDescription>
              下書き保存すると、この画面から写真を追加できるようになります。
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* 必要書類・備考 */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            必要書類・その他
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>出店にあたって確認したい書類</Label>
            <Chips
              options={DOCUMENT_TYPES.map((d) => ({ value: d.value, label: d.label }))}
              selected={form.requiredDocuments}
              onToggle={(v) => toggle("requiredDocuments", v)}
            />
            <p className="text-xs text-gray-500">
              書類は応募時には届きません。やり取りの中で出店者が開示したものを確認できます。
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">出店者への連絡事項</Label>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => set("note", e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="例: 搬入は8時から可能です。ゴミは各自お持ち帰りください。"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={isSaving}>
          {isSaving && savingMode === "published" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              公開中...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              募集を公開する
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1 rounded-full"
          disabled={isSaving}
          onClick={() => save("draft")}
        >
          {isSaving && savingMode === "draft" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              下書き保存
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
