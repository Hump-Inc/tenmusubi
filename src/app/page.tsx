"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { EventsTestingNotice } from "@/components/events/EventsTestingNotice";
import {
  ArrowRight,
  Truck,
  Eye,
  UserPlus,
  Handshake,
  CheckCircle2,
  Star,
  Shield,
  TrendingUp,
  CalendarDays,
  Send,
  MapPin,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProfileCard, DEFAULT_CARD_IMAGE } from "@/components/common/ProfileCard";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { CardIcon } from "@/components/common/CardIcon";
import { HOME_CARD_IMAGES, HOME_ROLE_PHOTOS, HOME_TRUST_PHOTOS } from "@/lib/homeImages";
import { Button } from "@/components/ui/button";

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
 * てんむすびの3つの使い方。立場ごとの LP（/for/...）への入口をここに並べる。
 * キッチンカーのオーナー自身がイベントを開けることが伝わっていなかったため
 * 出店・主催の2枚で見せていた（2026-08-28 先方要望）。場所を貸す側を加えて3枚にした。
 */
const roles = [
  {
    key: "vendor",
    icon: Truck,
    photo: HOME_ROLE_PHOTOS.vendor,
    title: "出店する",
    who: "キッチンカー・ハンドメイド・物販",
    points: ["出店募集を探して応募", "主催者からスカウトが届く", "申込情報は一度の登録で使い回す"],
    href: "/for/vendors",
  },
  {
    key: "space",
    icon: MapPin,
    photo: HOME_ROLE_PHOTOS.space,
    title: "場所を貸す",
    who: "駐車場・店先・商業施設の空き区画",
    points: ["スペースを無料で掲載", "出店者から相談が届く", "来てほしいお店に声をかける"],
    href: "/for/spaces",
  },
  {
    key: "organizer",
    icon: CalendarDays,
    photo: HOME_ROLE_PHOTOS.organizer,
    title: "イベントを開く",
    who: "マルシェ・お祭り・地域イベント",
    points: ["出店募集をつくって公開", "応募を並べて比べる・スカウトする", "出店料をオンラインで集金"],
    href: "/for/organizers",
  },
] as const;

const benefits = [
  {
    icon: Eye,
    image: HOME_CARD_IMAGES.benefitOwners,
    title: "スペースオーナーの目に留まる",
    desc: "登録するだけで、出店場所を提供したいオーナーがあなたを見つけてくれます。自分から営業する必要はありません。",
  },
  {
    icon: Star,
    image: HOME_CARD_IMAGES.benefitAppeal,
    title: "あなたの魅力を最大限にアピール",
    desc: "写真・メニュー・こだわりポイントなど、充実したプロフィールであなたのお店の魅力を伝えられます。",
  },
  {
    icon: Shield,
    image: HOME_CARD_IMAGES.benefitFree,
    title: "完全無料で利用可能",
    desc: "登録もプロフィール作成もすべて無料。まずは登録して、あなたのお店をアピールしましょう。",
  },
  {
    icon: TrendingUp,
    image: HOME_CARD_IMAGES.benefitChances,
    title: "出店チャンスが広がる",
    desc: "イベント・マルシェ・商業施設など、さまざまなスペースオーナーがあなたの出店先候補です。",
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session;
  const [featuredVendors, setFeaturedVendors] = useState<VendorResult[]>([]);
  const [vendorCount, setVendorCount] = useState(0);
  // 募集中のイベント。締切済みと開催済みはAPI側で落ちるので、そのまま並べられる。
  const [openEvents, setOpenEvents] = useState<EventCardData[]>([]);
  const [eventTotal, setEventTotal] = useState(0);

  useEffect(() => {
    fetch("/api/vendors?featured=true&limit=6")
      .then((r) => r.json())
      .then((data) => setFeaturedVendors(data.vendors || []))
      .catch(() => {});
    fetch("/api/vendors?limit=0")
      .then((r) => r.json())
      .then((data) => setVendorCount(data.total || 0))
      .catch(() => {});
    fetch("/api/events?limit=6")
      .then((r) => r.json())
      .then((data) => {
        setOpenEvents(data.events || []);
        setEventTotal(data.total || 0);
      })
      .catch(() => {});
  }, []);

  const toCard = (v: VendorResult) => ({
    id: v.storeId || v.id,
    name: v.displayName,
    image: v.images?.[0]?.url || v.user?.image || DEFAULT_CARD_IMAGE,
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

              {/* 募集を探す・声がかかる・自分で開くの3つが入った今は、
                  オファーを待つだけの見出しだと実態を映さない（2026-08-28 変更）。 */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                次の出店先が、
                <br />
                ここで見つかる
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

        {/* 3つの使い方。立場ごとの LP への入口 */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                てんむすびの3つの使い方
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                出店する、場所を貸す、イベントを開く。ひとつのアカウントで、どれからでもはじめられます。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {roles.map((r) => {
                const Icon = r.icon;
                return (
                  <Link
                    key={r.key}
                    href={r.href}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[16/9] bg-gray-100">
                      <Image
                        src={r.photo}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{r.title}</h3>
                          <p className="text-sm text-gray-500">{r.who}</p>
                        </div>
                      </div>
                      <ul className="space-y-2.5 flex-1">
                        {r.points.map((pt) => (
                          <li key={pt} className="flex gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                      <span className="mt-6 inline-flex items-center text-sm font-bold text-primary">
                        くわしく見る
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 出店者自身が主催に回れることを、独立して伝える */}
            <div className="mt-8 max-w-6xl mx-auto rounded-2xl bg-cream p-6 sm:p-8">
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
                    仲間のキッチンカーに声をかけてマルシェを開けば、出店の売上とは別に出店料という収入源が生まれます。
                    出店する側の勝手が分かっているからこそ、集まりやすい募集がつくれます。
                  </p>
                </div>
                <Button className="shrink-0 rounded-full px-6" asChild>
                  <Link href="/for/organizers">
                    はじめる
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 募集中のイベント。売り文句より先に、いま出ている募集そのものを見せる。
            1件も無いときは枠ごと出さない（空の棚を見せないため）。 */}
        {openEvents.length > 0 && (
          <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    いま募集中の出店
                  </h2>
                  <p className="mt-3 text-gray-600">
                    {eventTotal > 0
                      ? `${eventTotal}件の募集を受付中です。締切前にご確認ください`
                      : "締切前にご確認ください"}
                  </p>
                </div>
                <Button variant="outline" className="rounded-full" asChild>
                  <Link href="/search?type=event">
                    すべての募集を見る
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="-mt-4 mb-8">
                <EventsTestingNotice />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {openEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-gray-50">
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
                return (
                  <div
                    key={benefit.title}
                    className="flex gap-4 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <CardIcon src={benefit.image} icon={benefit.icon} />
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

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-white border-t border-gray-100">
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
                スムーズな取引をサポート
              </h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                はじめて組む相手とでも取引しやすいように、仕組みの側で守ります
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative aspect-[16/9] bg-gray-100">
                  <Image
                    src={HOME_TRUST_PHOTOS.documents}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">書類は出す相手を選べます</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    営業許可証やPL保険証券は、応募しただけでは相手に渡りません。
                    やり取りのうえで出店者自身が開示を決め、いつでも取り消せます。
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="relative aspect-[16/9] bg-gray-100">
                  <Image
                    src={HOME_TRUST_PHOTOS.verified}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">主催者は運営が確認します</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    募集を出せるのは、運営が内容を確認した主催者だけです。
                    どんな団体が、これまでどんなイベントを開いてきたのかを見てから応募できます。
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                <div className="relative aspect-[16/9] bg-gray-100">
                  <Image
                    src={HOME_TRUST_PHOTOS.payment}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {/* まだ動いていない機能なので、写真の上でも準備中と分かるようにする */}
                  <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                    準備中
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">出店料のオンライン決済</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    出店料のやり取りをてんむすび上で完結できるようにします。
                    当日の現金の受け渡しや、支払いの行き違いをなくすための仕組みです。
                    キャンセル時の返金ルールと合わせて準備しています。
                  </p>
                </div>
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
                <Link href="/for/organizers">イベントを主催する</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
