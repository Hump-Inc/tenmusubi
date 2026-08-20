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
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface EventInfo {
  id: string;
  title: string;
  venueName: string;
  area: string;
  exhibitFee: number;
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
        body: JSON.stringify({ storeId: selectedStoreId, message }),
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
                    登録済みの出店申込情報から自動で送られます。入力し直す必要はありません。
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
