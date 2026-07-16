"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  MapPin,
  Users,
  Shield,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/common/Logo";

const features = [
  {
    icon: Users,
    title: "簡単マッチング",
    description: "出店者とスペースオーナーを最適にマッチング。面倒な交渉は不要です。",
  },
  {
    icon: Shield,
    title: "安心・安全",
    description: "本人確認済みユーザーには認証マークを表示。安心して取引できる仕組みを整えています。",
  },
  {
    icon: MapPin,
    title: "全国対応",
    description: "日本全国のスペースを検索・掲載可能。地域を選ばず活用できます。",
  },
  {
    icon: Sparkles,
    title: "無料で利用開始",
    description: "登録料・月額費用は一切かかりません。成約時のみ手数料が発生します。",
  },
];

const stats = [
  { value: "500", suffix: "+", label: "登録スペース" },
  { value: "1,000", suffix: "+", label: "登録出店者" },
  { value: "98", suffix: "%", label: "満足度" },
];

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !userType) {
      setError("メールアドレスと利用目的を入力してください");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/pre-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登録に失敗しました");
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} animate={false} />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#d35f2d]">てんむすび</span>
              <span className="text-[10px] text-[#8b7355] tracking-wider">出店者 × スペース マッチング</span>
            </div>
          </div>
          <Button
            onClick={scrollToForm}
            className="rounded-full bg-gray-900 hover:bg-gray-800 text-white px-6"
          >
            先行登録
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=1920&q=80"
              alt="キッチンカーの様子"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/70" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 mb-8">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Coming Soon
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
                キッチンカー出店・
                <br />
                スペース提供なら
                <br />
                <span className="text-gray-900">てんむすび</span>
              </h1>

              <p className="mt-8 text-lg text-gray-600 leading-relaxed max-w-lg">
                キッチンカーやハンドメイド作家と、空きスペースを持つオーナーをつなぐ出店マッチングサービス。
                あなたのビジネスを次のステージへ。
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="rounded-full bg-gray-900 hover:bg-gray-800 text-white px-8 h-14 text-base"
                >
                  先行登録する（無料）
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-16 flex gap-12">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                      <span className="text-xl">{stat.suffix}</span>
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400">
            <span className="text-xs tracking-widest">SCROLL</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                てんむすびの特徴
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                出店ビジネスをもっと簡単に、もっと安心に。
                私たちが選ばれる理由をご紹介します。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 text-white mb-6">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                ご利用の流れ
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: "01", title: "無料登録", desc: "メールアドレスで簡単登録" },
                { step: "02", title: "検索・マッチング", desc: "条件に合う相手を探す" },
                { step: "03", title: "出店開始", desc: "メッセージで詳細を調整" },
              ].map((item, index) => (
                <div key={item.step} className="relative text-center">
                  <div className="text-6xl font-bold text-gray-100 mb-4">{item.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                  {index < 2 && (
                    <ArrowRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Registration Form Section */}
        <section id="registration-form" className="py-24 bg-gray-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              {isSuccess ? (
                <div className="text-center py-12">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 mx-auto mb-8">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">
                    登録完了しました！
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    ご登録ありがとうございます。
                    <br />
                    サービス開始時にメールでお知らせいたします。
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold">先行登録</h2>
                    <p className="mt-4 text-gray-400">
                      サービス開始時に優先的にご案内いたします
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="p-4 text-sm text-red-400 bg-red-900/30 rounded-xl border border-red-800">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        メールアドレス
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-xl h-14 bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-white focus:ring-white"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-gray-300">ご利用目的</Label>
                      <RadioGroup
                        value={userType}
                        onValueChange={setUserType}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        disabled={isLoading}
                      >
                        <Label
                          htmlFor="vendor"
                          className={`flex items-center gap-3 rounded-xl border-2 p-5 cursor-pointer transition-all ${
                            userType === "vendor"
                              ? "border-white bg-white/10"
                              : "border-white/20 hover:border-white/40"
                          }`}
                        >
                          <RadioGroupItem
                            value="vendor"
                            id="vendor"
                            className="border-white/50 text-white"
                          />
                          <div>
                            <div className="font-medium">出店者として</div>
                            <div className="text-sm text-gray-400">
                              スペースを探したい
                            </div>
                          </div>
                        </Label>
                        <Label
                          htmlFor="owner"
                          className={`flex items-center gap-3 rounded-xl border-2 p-5 cursor-pointer transition-all ${
                            userType === "owner"
                              ? "border-white bg-white/10"
                              : "border-white/20 hover:border-white/40"
                          }`}
                        >
                          <RadioGroupItem
                            value="owner"
                            id="owner"
                            className="border-white/50 text-white"
                          />
                          <div>
                            <div className="font-medium">オーナーとして</div>
                            <div className="text-sm text-gray-400">
                              スペースを貸したい
                            </div>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-xl h-14 text-base bg-white text-gray-900 hover:bg-gray-100"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          登録中...
                        </>
                      ) : (
                        <>
                          先行登録する（無料）
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                      登録することで、サービス開始のお知らせを受け取ることに同意したものとみなされます。
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Logo size={36} animate={false} />
            <div className="flex flex-col items-start">
              <span className="text-lg font-bold text-white">てんむすび</span>
              <span className="text-[10px] text-gray-400">出店者 × スペース マッチング</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} てんむすび. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
