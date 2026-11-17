"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CHIBA_CITIES,
  formatMonthDay,
  formatTimeRange,
  jstInputValue,
} from "@/lib/eventListing";
import { formatDateShort } from "@/lib/eventFormat";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  venueName: string;
  address: string | null;
  city: string;
  startAt: string;
  endAt: string;
  organizerName: string | null;
  sourceUrl: string;
  checkedAt: string;
  status: string;
  contactedAt: string | null;
  contactNote: string | null;
}

// 1件1〜2分で入れられることを優先し、日付と時刻を分けて入れる
interface FormState {
  title: string;
  date: string;
  startTime: string;
  endDate: string; // 空なら開始と同じ日
  endTime: string;
  venueName: string;
  address: string;
  city: string;
  organizerName: string;
  sourceUrl: string;
  description: string;
}

const EMPTY: FormState = {
  title: "",
  date: "",
  startTime: "10:00",
  endDate: "",
  endTime: "15:00",
  venueName: "",
  address: "",
  city: "",
  organizerName: "",
  sourceUrl: "",
  description: "",
};

function toForm(l: Listing): FormState {
  const start = jstInputValue(l.startAt);
  const end = jstInputValue(l.endAt);
  const date = start.slice(0, 10);
  const endDate = end.slice(0, 10);
  return {
    title: l.title,
    date,
    startTime: start.slice(11, 16),
    endDate: endDate === date ? "" : endDate,
    endTime: end.slice(11, 16),
    venueName: l.venueName,
    address: l.address ?? "",
    city: l.city,
    organizerName: l.organizerName ?? "",
    sourceUrl: l.sourceUrl,
    description: l.description ?? "",
  };
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/listings?scope=${scope}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setListings(data.listings);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const body = {
        title: form.title,
        startAt: `${form.date}T${form.startTime}`,
        endAt: `${form.endDate || form.date}T${form.endTime}`,
        venueName: form.venueName,
        address: form.address,
        city: form.city,
        organizerName: form.organizerName,
        sourceUrl: form.sourceUrl,
        description: form.description,
        checkedAt: new Date().toISOString(),
      };
      const res = await fetch(editingId ? `/api/admin/listings/${editingId}` : "/api/admin/listings", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }
      setNotice(editingId ? "更新しました" : `「${form.title}」を載せました`);
      // 続けて入れやすいよう、市町村と日付は残す
      setForm(editingId ? EMPTY : { ...EMPTY, city: form.city, date: form.date });
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const act = async (l: Listing, action: string, extra: Record<string, string> = {}) => {
    setBusyId(l.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/listings/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "更新に失敗しました");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const markContacted = (l: Listing) => {
    const note = window.prompt(`「${l.title}」の主催者に連絡した方法・内容のメモ（空欄可）`, l.contactNote ?? "");
    if (note === null) return;
    act(l, "contacted", { contactNote: note });
  };

  const handleDelete = async (l: Listing) => {
    if (!window.confirm(`「${l.title}」を削除しますか？\n主催者からの取り下げ依頼なら「取り下げ」を使ってください。`)) return;
    setBusyId(l.id);
    try {
      await fetch(`/api/admin/listings/${l.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          管理画面に戻る
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-orange-500" />
              イベント掲載
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              公開情報をもとに、千葉のイベントを開催カレンダーに載せます。
              載せるのは事実（名前・日時・場所）だけにし、紹介文や写真は転載しないでください。
            </p>
          </div>
          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/calendar" target="_blank">
              カレンダーを見る
              <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {notice && <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

        <Card className="mb-8">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">イベント名 *</Label>
                <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <Label htmlFor="date">開催日 *</Label>
                  <Input id="date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="startTime">開始 *</Label>
                  <Input id="startTime" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="endTime">終了 *</Label>
                  <Input id="endTime" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} required />
                </div>
              </div>
              <div>
                <Label htmlFor="endDate">終了日（2日以上続く場合だけ）</Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city">市町村 *</Label>
                <select
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  required
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">選んでください</option>
                  {CHIBA_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="venueName">会場 *</Label>
                <Input id="venueName" value={form.venueName} onChange={(e) => set("venueName", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="address">住所</Label>
                <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="organizerName">主催者名</Label>
                <Input id="organizerName" value={form.organizerName} onChange={(e) => set("organizerName", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sourceUrl">情報元のURL *</Label>
                <Input id="sourceUrl" type="url" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">ひとこと（自分の言葉で。情報元の文章は貼らない）</Label>
                <Textarea
                  id="description"
                  rows={2}
                  maxLength={400}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving} className="rounded-full">
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingId ? "更新する" : "載せる"}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => {
                      setEditingId(null);
                      setForm(EMPTY);
                    }}
                  >
                    編集をやめる
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mb-3 flex gap-2">
          {(["upcoming", "past"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={scope === s ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setScope(s)}
            >
              {s === "upcoming" ? "これから" : "終わったもの"}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : listings.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">まだありません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>開催</TableHead>
                    <TableHead>イベント</TableHead>
                    <TableHead>主催者への連絡</TableHead>
                    <TableHead>最終確認</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((l) => {
                    const busy = busyId === l.id;
                    const start = new Date(l.startAt);
                    return (
                      <TableRow key={l.id} className={l.status === "hidden" ? "opacity-50" : undefined}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatMonthDay(start)}
                          <span className="block text-xs text-gray-500">
                            {formatTimeRange(start, new Date(l.endAt))}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Link href={`/listings/${l.id}`} target="_blank" className="font-medium hover:underline">
                            {l.title}
                          </Link>
                          {l.status === "hidden" && (
                            <Badge variant="outline" className="ml-2">取り下げ</Badge>
                          )}
                          <span className="block text-xs text-gray-500">
                            {l.city}・{l.venueName}
                            {l.organizerName && `／${l.organizerName}`}
                          </span>
                          <a
                            href={l.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            情報元
                          </a>
                        </TableCell>
                        <TableCell className="text-sm">
                          {l.contactedAt ? (
                            <>
                              <span className="text-green-700">{formatDateShort(l.contactedAt)}</span>
                              {l.contactNote && (
                                <span className="block max-w-[200px] text-xs text-gray-500">{l.contactNote}</span>
                              )}
                              <button
                                className="block text-xs text-gray-500 hover:underline"
                                disabled={busy}
                                onClick={() => act(l, "uncontacted")}
                              >
                                取り消す
                              </button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => markContacted(l)}>
                              連絡した
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateShort(l.checkedAt)}
                          <button
                            className="block text-xs text-blue-600 hover:underline"
                            disabled={busy}
                            onClick={() => act(l, "checked")}
                          >
                            今日確認した
                          </button>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => {
                                setEditingId(l.id);
                                setForm(toForm(l));
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                            >
                              編集
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => act(l, l.status === "hidden" ? "show" : "hide")}
                            >
                              {l.status === "hidden" ? "再掲載" : "取り下げ"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              disabled={busy}
                              onClick={() => handleDelete(l)}
                            >
                              削除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
