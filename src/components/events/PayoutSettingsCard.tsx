"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PayoutState {
  enabled: boolean;
  state: "none" | "pending" | "ready";
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  feePercent: number;
}

/**
 * 出展料をオンラインで受け取るための口座設定。登録そのものは Stripe の画面で行う。
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
          出展料のオンライン受け取り
        </CardTitle>
        <CardDescription>
          設定すると、出店が決まった出店者に出展料を請求し、カードで支払ってもらえます。
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
                受け取った出展料から手数料 {data.feePercent}%（税込）を差し引いた額が、登録した口座に入金されます。
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
                  variant="outline"
                  className="rounded-full"
                  onClick={() => go("/api/organizer/payouts/dashboard")}
                  disabled={isWorking}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  入金状況・口座の変更
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
