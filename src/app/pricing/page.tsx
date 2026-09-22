"use client";

import Link from "next/link";
import {
  Crown,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "フリープラン",
    price: "¥0",
    period: "/月",
    description: "まずは無料で始めてみましょう",
    badge: null,
    features: [
      { name: "スペース登録", included: true },
      { name: "基本的なマッチング機能", included: true },
      { name: "メッセージ機能", included: true },
      { name: "予約・申請管理", included: true },
      { name: "プレミアムバッジ表示", included: false },
    ],
    cta: "無料で始める",
    ctaHref: "/register?type=owner",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "プレミアムプラン",
    price: "¥2,980",
    period: "/月（税込）",
    description: "プロフィールにプレミアムバッジを表示できます",
    badge: "おすすめ",
    // 実際に提供しているものだけを載せる。検索上位・アクセス解析などは未実装のため
    // 載せていない（作ったら足す）。
    features: [
      { name: "スペース登録", included: true },
      { name: "基本的なマッチング機能", included: true },
      { name: "メッセージ機能", included: true },
      { name: "予約・申請管理", included: true },
      { name: "プレミアムバッジ表示", included: true },
    ],
    cta: "プレミアムを始める",
    ctaHref: "/settings/payment",
    variant: "default" as const,
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="rounded-full mb-4">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              料金プラン
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">
              あなたのビジネスに合ったプランを
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              スペースオーナー向けのプランです。出店者の方は無料でご利用いただけます。
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-2xl relative ${
                  plan.highlight
                    ? "border-2 border-amber-300 shadow-lg"
                    : "border-0 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white rounded-full px-4">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.name}
                        className="flex items-center gap-3 text-sm"
                      >
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300 shrink-0" />
                        )}
                        <span
                          className={
                            feature.included ? "" : "text-muted-foreground"
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full rounded-full ${
                      plan.highlight
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : ""
                    }`}
                    variant={plan.variant}
                  >
                    <Link href={plan.ctaHref}>
                      {plan.highlight && <Crown className="h-4 w-4 mr-2" />}
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-8">
              よくある質問
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "プランはいつでも変更できますか？",
                  a: "はい、いつでもアップグレード・ダウングレードが可能です。解約した場合も、期間終了まではプレミアム機能をご利用いただけます。",
                },
                {
                  q: "支払い方法は何が使えますか？",
                  a: "クレジットカード（Visa、Mastercard、American Express、JCB）でお支払いいただけます。",
                },
                {
                  q: "出店者もプランに加入する必要がありますか？",
                  a: "いいえ、出店者の方はすべての機能を無料でご利用いただけます。料金プランはスペースオーナー向けのサービスです。",
                },
              ].map((item) => (
                <Card
                  key={item.q}
                  className="rounded-2xl border-0 shadow-sm"
                >
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900">{item.q}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.a}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
