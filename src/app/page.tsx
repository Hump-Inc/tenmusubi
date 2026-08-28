"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Truck,
  Palette,
  Package,
  Eye,
  UserPlus,
  Handshake,
  CheckCircle2,
  Star,
  Shield,
  TrendingUp,
  CalendarDays,
  Send,
  Search,
  Users,
  Wallet,
  FileCheck2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard } from "@/components/common/ProfileCard";
import { Button } from "@/components/ui/button";
import { VENDOR_CATEGORIES } from "@/lib/constants";

const categoryIcons = {
  Truck,
  Palette,
  Package,
} as const;

interface VendorResult {
  id: string;
  storeId?: string;
  displayName: string;
  description: string;
  area: string;
  tags: string;
  images: { url: string }[];
  user: { image: string };
  averageRating: number;
  reviewCount: number;
}

const steps = [
  { icon: UserPlus, title: "無料で登録", desc: "メールまたはSNSで簡単アカウント作成" },
  { icon: Truck, title: "出店情報を登録", desc: "写真・メニュー・車両や設備の条件をまとめて登録" },
  {
    icon: Send,
    title: "応募する / 声がかかる",
    desc: "出店募集に応募。主催者からスカウトが届くこともあります",
  },
  { icon: Handshake, title: "やり取りして出店決定", desc: "条件を相談し、書類は必要なときだけ開示" },
];

/**
 * てんむすびでできること。出店者と主催者の両方の入口をここで見せる。
 * キッチンカーのオーナー自身がイベントを開けることが伝わっていなかったため
 * （2026-08-28 先方要望）。
 */
const vendorFeatures = [
  {
    icon: Search,
    title: "出店募集を探して応募する",
    desc: "エリア・開催月・業種で募集を絞り込み。区画ごとの出展料まで見てから応募できます。",
  },
  {
    icon: Send,
    title: "主催者からスカウトが届く",
    desc: "登録しておくと、出店者を探している主催者から直接お誘いが届きます。",
  },
  {
    icon: FileCheck2,
    title: "申込情報は一度の登録で使い回す",
    desc: "車両・設備・メニューを登録しておけば、応募のたびに書き直す必要はありません。イベントごとに変わる火気の台数などは、その場で直せます。",
  },
];

const organizerFeatures = [
  {
    icon: CalendarDays,
    title: "出店募集をつくる",
    desc: "開催日・会場・区画ごとの出展料・必要な設備を登録して公開。募集ページがそのまま告知になります。",
  },
  {
    icon: Users,
    title: "応募をまとめて比べる",
    desc: "電源・火気・必要スペースが会場の条件と噛み合うかを自動で照合。並べて比較できます。",
  },
  {
    icon: Send,
    title: "こちらからスカウトする",
    desc: "応募を待つだけでなく、出店してほしいお店へ直接お誘いを送れます。",
  },
];

const benefits = [
  {
    icon: Eye,
    title: "スペースオーナーの目に留まる",
    desc: "登録するだけで、出店場所を提供したいオーナーがあなたを見つけてくれます。自分から営業する必要はありません。",
  },
  {
    icon: Star,
    title: "あなたの魅力を最大限にアピール",
    desc: "写真・メニュー・こだわりポイントなど、充実したプロフィールであなたのお店の魅力を伝えられます。",
  },
  {
    icon: Shield,
    title: "完全無料で利用可能",
    desc: "登録もプロフィール作成もすべて無料。まずは登録して、あなたのお店をアピールしましょう。",
  },
  {
    icon: TrendingUp,
    title: "出店チャンスが広がる",
    desc: "イベント・マルシェ・商業施設など、さまざまなスペースオーナーがあなたの出店先候補です。",
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session;
  const [featuredVendors, setFeaturedVendors] = useState<VendorResult[]>([]);
  const [vendorCount, setVendorCount] = useState(0);

  useEffect(() => {
    fetch("/api/vendors?featured=true&limit=6")
      .then((r) => r.json())
      .then((data) => setFeaturedVendors(data.vendors || []))
      .catch(() => {});
    fetch("/api/vendors?limit=0")
      .then((r) => r.json())
      .then((data) => setVendorCount(data.total || 0))
      .catch(() => {});
  }, []);

  const toCard = (v: VendorResult) => ({
    id: v.storeId || v.id,
    name: v.displayName,
    image: v.images?.[0]?.url || v.user?.image || "/placeholder.jpg",
    location: v.area || "未設定",
    rating: v.averageRating || 0,
    reviewCount: v.reviewCount || 0,
    tags: v.tags ? JSON.parse(v.tags) : [],
    description: v.description || "",
  });

  const ctaHref = isLoggedIn ? "/mypage" : "/register?type=vendor";
  const ctaLabel = isLoggedIn ? "マイページへ" : "無料で出店者登録";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1567129937968-cdad8f07e2f8?w=1920&q=80"
              alt="キッチンカーマルシェの賑わい"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
          </div>

          <div className="container mx-auto px-4 relative z-10 text-white py-20">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-sm mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                {vendorCount > 0
                  ? `現在 ${vendorCount} 名の出店者が登録中`
                  : "出店者の登録受付中"}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                登録するだけで
                <br />
                出店オファーが届く
              </h1>
              <p className="mt-6 text-lg md:text-xl text-white/90 leading-relaxed max-w-xl">
                出店募集を探して応募する。主催者から声がかかる。自分でイベントを開く。
                出店にまつわることが、ここでひと続きになります。
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="rounded-full px-8 h-14 text-base shadow-lg"
                  asChild
                >
                  <Link href={ctaHref}>
                    {ctaLabel}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline-white"
                  className="rounded-full px-8 h-14 text-base"
                  asChild
                >
                  <Link href="/search?type=event">
                    出店募集を見る
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  登録無料
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  最短1分で登録
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  出店募集への応募も主催もできる
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                てんむすびに登録するメリット
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                出店場所を探す手間を減らし、あなたのビジネスに集中できます
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="flex gap-4 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">{benefit.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* できること。出店する側と、イベントを開く側の両方を並べて見せる。 */}
        <section className="py-16 md:py-24 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                てんむすびでできること
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                出店する側にも、イベントを開く側にもなれます。ひとつのアカウントで両方使えます。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* 出店したい人 */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">出店したい方</h3>
                    <p className="text-sm text-gray-500">キッチンカー・ハンドメイド・物販</p>
                  </div>
                </div>
                <ul className="space-y-5">
                  {vendorFeatures.map((f) => {
                    const Icon = f.icon;
                    return (
                      <li key={f.title} className="flex gap-3">
                        <Icon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900">{f.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">{f.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="outline" className="mt-7 w-full rounded-full" asChild>
                  <Link href="/search?type=event">出店募集を探す</Link>
                </Button>
              </div>

              {/* イベントを開きたい人 */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">イベントを開きたい方</h3>
                    <p className="text-sm text-gray-500">主催者・商業施設・自治体</p>
                  </div>
                </div>
                <ul className="space-y-5">
                  {organizerFeatures.map((f) => {
                    const Icon = f.icon;
                    return (
                      <li key={f.title} className="flex gap-3">
                        <Icon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900">{f.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">{f.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="outline" className="mt-7 w-full rounded-full" asChild>
                  <Link href="/organizer">イベントを主催する</Link>
                </Button>
              </div>
            </div>

            {/* 出店者自身が主催に回れることを、独立して伝える */}
            <div className="mt-8 max-w-5xl mx-auto rounded-2xl bg-cream p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    キッチンカーのオーナーが、主催者になれます
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    出店を待つだけでなく、自分でイベントを立てて出店者を集められます。
                    仲間のキッチンカーに声をかけてマルシェを開けば、出店の売上とは別に出展料という収入源が生まれます。
                    出店する側の勝手が分かっているからこそ、集まりやすい募集がつくれます。
                  </p>
                </div>
                <Button className="shrink-0 rounded-full px-6" asChild>
                  <Link href="/organizer">
                    はじめる
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                出店までの流れ
              </h2>
              <p className="mt-4 text-gray-600">
                簡単4ステップで出店チャンスが広がります
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {steps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="relative text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white mx-auto mb-4">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-bold text-primary mb-2">
                      STEP {index + 1}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                    {index < steps.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute top-6 -right-4 h-6 w-6 text-gray-300" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Button size="lg" className="rounded-full px-10 h-14 text-base" asChild>
                <Link href={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Category Cards */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                登録できるカテゴリ
              </h2>
              <p className="mt-4 text-gray-600">
                あなたの業種に合ったカテゴリで登録できます
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {VENDOR_CATEGORIES.map((cat) => {
                const Icon = categoryIcons[cat.icon as keyof typeof categoryIcons];
                return (
                  <div
                    key={cat.id}
                    className="relative rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {cat.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {cat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Vendors */}
        {featuredVendors.length > 0 && (
          <section className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  すでに登録している出店者
                </h2>
                <p className="mt-4 text-gray-600">
                  多くの出店者がてんむすびを活用しています
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredVendors.map((v) => {
                  const card = toCard(v);
                  return (
                    <ProfileCard
                      key={card.id}
                      id={card.id}
                      type="vendor"
                      name={card.name}
                      image={card.image}
                      location={card.location}
                      rating={card.rating}
                      reviewCount={card.reviewCount}
                      tags={card.tags}
                      description={card.description}
                    />
                  );
                })}
              </div>

              <div className="mt-8 text-center">
                <Button variant="outline" className="rounded-full" asChild>
                  <Link href="/search?type=vendor">
                    すべての出店者を見る
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 取引の安心。決済はまだ動いていないので「準備中」と明記する。 */}
        <section className="py-16 md:py-24 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                お金と書類のことで、揉めないように
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                はじめて組む相手とでも取引しやすいように、仕組みの側で守ります
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">書類は出す相手を選べます</h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  営業許可証やPL保険証券は、応募しただけでは相手に渡りません。
                  やり取りのうえで出店者自身が開示を決め、いつでも取り消せます。
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">主催者は運営が確認します</h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  募集を出せるのは、運営が内容を確認した主催者だけです。
                  どんな団体が、これまでどんなイベントを開いてきたのかを見てから応募できます。
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                    準備中
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">出展料のオンライン決済</h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  出展料のやり取りをてんむすび上で完結できるようにします。
                  当日の現金の受け渡しや、支払いの行き違いをなくすための仕組みです。
                  キャンセル時の返金ルールと合わせて準備しています。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              出店するのも、
              <br className="sm:hidden" />
              イベントを開くのも
            </h2>
            <p className="mt-4 text-white/90 max-w-xl mx-auto">
              ひとつのアカウントではじめられます。
              <br />
              登録は無料、わずか1分で完了します。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="white-primary"
                className="rounded-full px-10 h-14 text-base shadow-lg"
                asChild
              >
                <Link href={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline-white"
                className="rounded-full px-10 h-14 text-base"
                asChild
              >
                <Link href="/organizer">イベントを主催する</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
