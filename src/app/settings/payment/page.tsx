"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Crown,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SubscriptionData {
  plan: "free" | "premium";
  subscription: {
    status: string;
    stripePriceId: string;
    stripeCurrentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

// 実際に提供しているものだけを載せる。検索上位・アクセス解析などは未実装のため
// 載せていない（作ったら足す）。
const premiumFeatures = [
  "プレミアムバッジ表示",
];

const freeFeatures = [
  { name: "スペース登録", included: true },
  { name: "基本的な検索表示", included: true },
  { name: "プレミアムバッジ表示", included: false },
];

export default function PaymentSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <PaymentSettingsContent />
    </Suspense>
  );
}

function PaymentSettingsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/subscription");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error || "エラーが発生しました");
        setIsProcessing(false);
      }
    } catch {
      alert("エラーが発生しました");
      setIsProcessing(false);
    }
  };

  const handleManage = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error || "エラーが発生しました");
        setIsProcessing(false);
      }
    } catch {
      alert("エラーが発生しました");
      setIsProcessing(false);
    }
  };

  const isPremium = data?.plan === "premium";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold">お支払い・プラン管理</h1>
            <p className="mt-2 text-muted-foreground">
              サブスクリプションプランの確認・変更ができます
            </p>
          </div>

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-700 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>プレミアムプランへのアップグレードが完了しました！</span>
            </div>
          )}

          {canceled && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 text-amber-700 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>チェックアウトがキャンセルされました。</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isPremium ? (
            /* プレミアムプラン表示 */
            <div className="space-y-6">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      現在のプラン
                    </CardTitle>
                    <Badge className="bg-amber-500 text-white rounded-full">
                      プレミアム
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.subscription?.cancelAtPeriodEnd && (
                    <div className="p-4 rounded-xl bg-amber-50 text-amber-700 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">期間終了で解約されます</p>
                        <p className="text-sm mt-1">
                          {new Date(data.subscription.stripeCurrentPeriodEnd).toLocaleDateString("ja-JP")}
                          にプレミアムプランが終了し、フリープランに切り替わります。
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">ステータス</p>
                      <p className="font-bold mt-1">
                        {data?.subscription?.status === "active" ? "有効" : data?.subscription?.status}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">次回請求日</p>
                      <p className="font-bold mt-1">
                        {data?.subscription?.stripeCurrentPeriodEnd
                          ? new Date(data.subscription.stripeCurrentPeriodEnd).toLocaleDateString("ja-JP")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-3">プレミアム特典</h3>
                    <ul className="space-y-2">
                      {premiumFeatures.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={handleManage}
                    disabled={isProcessing}
                    className="w-full rounded-full"
                    variant="outline"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    プランを管理する
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* フリープラン表示 */
            <div className="space-y-6">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      現在のプラン
                    </CardTitle>
                    <Badge variant="secondary" className="rounded-full">
                      フリー
                    </Badge>
                  </div>
                  <CardDescription>
                    プレミアムプランにアップグレードして、すべての機能を利用しましょう
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {freeFeatures.map((feature) => (
                      <li key={feature.name} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300 shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-2 border-amber-200 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    プレミアムプランにアップグレード
                  </CardTitle>
                  <CardDescription>
                    すべての機能を解放して、ビジネスを加速させましょう
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {premiumFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-amber-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                    className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Crown className="h-4 w-4 mr-2" />
                    )}
                    プレミアムにアップグレード
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-muted/50">
            <h3 className="font-medium text-sm">お支払いについて</h3>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>・お支払いはクレジットカードで毎月自動的に行われます</li>
              <li>・プランの変更・解約はいつでも可能です</li>
              <li>・解約後も期間終了まではプレミアム機能をご利用いただけます</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
