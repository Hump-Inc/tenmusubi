"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Loader2, ExternalLink, CheckCircle2, AlertTriangle, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/eventFormat";

interface BankAccount {
  bankName: string | null;
  branchCode: string | null;
  last4: string;
  holderName: string | null;
}

interface EventPayout {
  eventId: string;
  title: string;
  startAt: string;
  gross: number;
  fee: number;
  payout: number;
  status: "scheduled" | "waiting" | "in_transit" | "paid" | "nothing";
  date: string | null;
}

const PAYOUT_STATUS: Record<EventPayout["status"], { label: string; style: string }> = {
  scheduled: { label: "入金予定", style: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  waiting: { label: "入金待ち", style: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  in_transit: { label: "送金中", style: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  paid: { label: "着金済み", style: "bg-green-100 text-green-700 hover:bg-green-100" },
  nothing: { label: "入金なし", style: "bg-gray-100 text-gray-500 hover:bg-gray-100" },
};

function yen(n: number) {
  return `${n.toLocaleString("ja-JP")}円`;
}

function payoutDateLine(p: EventPayout) {
  const d = formatDateShort(p.date);
  switch (p.status) {
    case "scheduled":
      return d ? `${d}ごろ入金` : "開催後に入金";
    case "waiting":
      return "売上の確定を待って、翌日以降に入金します";
    case "in_transit":
      return d ? `${d}ごろ着金` : "銀行へ送金中";
    case "paid":
      return d ? `${d} 着金` : "着金済み";
    case "nothing":
      return "全額返金のため入金はありません";
  }
}

interface PayoutState {
  enabled: boolean;
  state: "none" | "pending" | "ready";
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  feePercent: number;
  bankAccount: BankAccount | null;
  payouts: EventPayout[];
  lastPayoutFailed: boolean;
}

/**
 * 出店料をオンラインで受け取るための口座設定。登録そのものは Stripe の画面で行う。
 * 使わない主催者（現金・振込で受け取る）もいるので、任意の設定として出す。
 */
export function PayoutSettingsCard() {
  const [data, setData] = useState<PayoutState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/organizer/payouts");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "取得に失敗しました");
        return;
      }
      setData(json);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const go = async (path: string) => {
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch(path, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error || "開けませんでした");
        setIsWorking(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("開けませんでした");
      setIsWorking(false);
    }
  };

  // 決済を切っている間は枠ごと出さない。切っているかは取得するまで分からないので、
  // 読み込み中も出さない（出してから消すとちらつく）
  if (isLoading || (data && !data.enabled)) return null;

  return (
    <Card className="rounded-2xl border-0 shadow-sm mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-orange-500" />
          出店料のオンライン受け取り
        </CardTitle>
        <CardDescription>
          設定すると、出店が決まった出店者に出店料を請求し、カードで支払ってもらえます。
          現金や振込で受け取る場合は設定しなくてかまいません。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data ? (
          <>
            {data.state === "ready" && (
              <div className="rounded-xl bg-green-50 p-4 flex items-start gap-3 text-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">オンラインで受け取れます</p>
                  <p className="mt-1 opacity-90">
                    出店者とのやり取りの画面から請求できます。
                    {!data.payoutsEnabled &&
                      " 口座への入金は、Stripe の確認が終わり次第はじまります。"}
                  </p>
                </div>
              </div>
            )}
            {data.state === "pending" && (
              <div className="rounded-xl bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm">
                  {data.detailsSubmitted
                    ? "Stripe が登録内容を確認しています。追加の情報を求められている場合は「続きを入力する」から進めてください。"
                    : "登録が途中です。「続きを入力する」から残りを入力してください。"}
                </p>
              </div>
            )}

            {data.lastPayoutFailed && (
              <div className="rounded-xl bg-red-50 p-4 flex items-start gap-3 text-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm">
                  直近の入金が口座に届きませんでした。口座の情報に誤りがないか、「口座を変更する」から確認してください。
                  直したあと、翌日以降にもう一度入金します。
                </p>
              </div>
            )}

            {/* 受け取り口座。表示はここ、変更は Stripe の画面で（本人確認を Stripe が行うため） */}
            {data.detailsSubmitted && (
              <div className="rounded-xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Landmark className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">受け取り口座</p>
                    {data.bankAccount ? (
                      <>
                        <p className="text-sm font-medium text-gray-900">
                          {data.bankAccount.bankName ?? "銀行口座"}
                          {data.bankAccount.branchCode && `（支店コード ${data.bankAccount.branchCode}）`}
                          <span className="ml-2 font-normal">口座番号 ****{data.bankAccount.last4}</span>
                        </p>
                        {data.bankAccount.holderName && (
                          <p className="text-xs text-gray-500 mt-0.5">名義 {data.bankAccount.holderName}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-900">口座を取得できませんでした</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => go("/api/organizer/payouts/dashboard")}
                  disabled={isWorking}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  口座を変更する
                </Button>
              </div>
            )}

            {/* 入金状況。募集ごとに、いつ・いくら入るか */}
            {data.detailsSubmitted && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">入金状況</p>
                {data.payouts.length === 0 ? (
                  <p className="text-sm text-gray-500">まだオンラインで受け取った出店料はありません。</p>
                ) : (
                  <ul className="space-y-2">
                    {data.payouts.map((p) => (
                      <li
                        key={p.eventId}
                        className="rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDateShort(p.startAt)} 開催 ・ 出店料 {yen(p.gross)} − 手数料 {yen(p.fee)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge className={PAYOUT_STATUS[p.status].style}>{PAYOUT_STATUS[p.status].label}</Badge>
                            <span className="text-sm font-medium text-gray-900">{yen(p.payout)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{payoutDateLine(p)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>
                決済は Stripe が行います。口座情報や本人確認書類は Stripe に直接登録され、
                てんむすびには保存されません。
              </li>
              <li>
                登録の途中でウェブサイトを求められます。ウェブサイトが無い場合は、
                Instagram などイベントの様子が分かる SNS の URL で大丈夫です。
              </li>
              <li>
                受け取った出店料から手数料 {data.feePercent}%（税込）を差し引いた額が、登録した口座に入金されます。
                入金はイベントの終了後です（開催前のキャンセルに返金で応じられるよう、それまでは Stripe でお預かりします）。
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              {data.state !== "ready" && (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => go("/api/organizer/payouts")}
                  disabled={isWorking}
                >
                  {isWorking && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {data.state === "none" ? "受け取り口座を設定する" : "続きを入力する"}
                </Button>
              )}
              {data.detailsSubmitted && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-gray-500"
                  onClick={() => go("/api/organizer/payouts/dashboard")}
                  disabled={isWorking}
                >
                  {isWorking && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Stripe の画面で詳しく見る
                </Button>
              )}
            </div>
          </>
        ) : null}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
