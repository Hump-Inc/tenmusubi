"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Search,
  Send,
  Store as StoreIcon,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FitBadges } from "@/components/events/ApplicantSpecList";
import { SEARCH_CATEGORIES, AREAS } from "@/lib/constants";

interface Candidate {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  description: string | null;
  image: string | null;
  hasApplicationProfile: boolean;
  follows: boolean;
  fit: { label: string; ok: boolean; detail: string }[];
  existing: { id: string; kind: string; status: string } | null;
}

export default function ScoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();

  const [eventTitle, setEventTitle] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");
  const [area, setArea] = useState("すべて");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [target, setTarget] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category !== "すべて") params.set("category", category);
      if (area !== "すべて") params.set("area", area);

      const res = await fetch(`/api/events/${id}/scout?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setError("");
      setEventTitle(data.event?.title ?? "");
      setCandidates(data.candidates ?? []);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id, query, category, area]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/events/${id}/scout`);
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, id, load]);

  const send = async () => {
    if (!target) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/events/${id}/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: target.id, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        return;
      }
      setTarget(null);
      setMessage("");
      await load();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href={`/events/${id}/applications`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            応募一覧に戻る
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-orange-500" />
              出店者をスカウト
            </h1>
            <p className="text-sm text-gray-600 mt-1 truncate">{eventTitle}</p>
            <p className="text-sm text-gray-600 mt-2">
              応募を待たずに、こちらから出店をお願いできます。送るとやり取りが始まり、
              出店者が受けると出店内容が届きます。
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {/* 絞り込み */}
          <div className="mb-6 flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="店名・キーワードで探す"
                className="bg-white pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "すべて" ? "カテゴリー" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "すべて" ? "エリア" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : candidates.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-10 text-center">
                <StoreIcon className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-gray-600">条件に合う出店者が見つかりませんでした</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {candidates.map((c) => (
                <Card key={c.id} className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="flex flex-wrap items-start gap-4 p-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {c.image ? (
                        <Image src={c.image} alt="" fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <StoreIcon className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/store/${c.id}`}
                          target="_blank"
                          className="font-bold text-gray-900 hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.follows && (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[11px] font-normal">
                            この募集元をフォロー中
                          </Badge>
                        )}
                        {!c.hasApplicationProfile && (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            出店申込情報が未登録
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {[c.category, c.area].filter(Boolean).join(" ・ ") || "未設定"}
                      </p>
                      {c.fit.length > 0 && (
                        <div className="mt-2">
                          <FitBadges fit={c.fit} />
                        </div>
                      )}
                      {c.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-gray-600">{c.description}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {c.existing ? (
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link href={`/events/applications/${c.existing.id}`}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            {c.existing.kind === "scout" ? "スカウト済み" : "応募あり"}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setTarget(c);
                            setMessage("");
                          }}
                        >
                          <Send className="mr-1 h-4 w-4" />
                          スカウトを送る
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{target?.name} にスカウトを送る</DialogTitle>
            <DialogDescription>
              相手には通知が届き、やり取りが始まります。会場や区画の条件など、
              声をかけた理由を書いておくと返事がもらいやすくなります。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scoutMessage">メッセージ（任意）</Label>
            <Textarea
              id="scoutMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              rows={5}
              placeholder="例: 昨年のマルシェで拝見しました。当日は角地の区画をご用意できます。ぜひご検討ください。"
            />
            <p className="text-right text-xs text-gray-500">{message.length} / 1000</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setTarget(null)}
              disabled={isSending}
            >
              キャンセル
            </Button>
            <Button className="rounded-full" onClick={send} disabled={isSending}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              送る
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
