"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import {
  User,
  Heart,
  MessageCircle,
  Calendar,
  Star,
  ChevronRight,
  Edit,
  Shield,
  Bell,
  CreditCard,
  HelpCircle,
  LogOut,
  MapPin,
  Loader2,
  Link2,
  Plus,
  Building2,
  Store,
  Mail,
  LayoutDashboard,
  Crown,
  QrCode,
  Sparkles,
  ExternalLink,
  ClipboardList,
  Share2,
  CalendarDays,
  Send,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyEventCard, isFinished, type MyEventData } from "@/components/events/MyEventCard";
import { Separator } from "@/components/ui/separator";

interface Profile {
  displayName: string;
  description?: string;
  category?: string;
  area?: string;
  isVerified: boolean;
  userTypes?: string[];
  images?: { id: string; url: string }[];
}

interface Favorite {
  id: string;
  space: {
    id: string;
    name: string;
    location: string;
    price?: string;
    images: { url: string }[];
    _count: { reviews: number };
  };
}

interface Booking {
  id: string;
  date: string;
  status: string;
  space?: { id: string; name: string; location: string };
}

interface Review {
  id: string;
  rating: number;
  content?: string;
  createdAt: string;
  author: { id: string; name?: string; image?: string };
  space?: { id: string; name: string };
}

interface Space {
  id: string;
  name: string;
  location: string;
  price?: string;
  isActive: boolean;
  images: { url: string }[];
  _count: { reviews: number; favorites: number };
}

interface StoreData {
  id: string;
  name: string;
  category?: string;
  area?: string;
  isActive: boolean;
  images: { url: string }[];
}

interface CheckInData {
  id: string;
  createdAt: string;
  store: {
    id: string;
    name: string;
    area?: string;
    category?: string;
    images: { url: string }[];
  };
}

const menuItems = [
  { icon: User, label: "プロフィール編集", href: "/profile/edit" },
  { icon: Link2, label: "アカウント連携", href: "/settings/account" },
  { icon: Bell, label: "通知設定", href: "/settings/notifications" },
  { icon: Shield, label: "本人確認", href: "/settings/verification", badge: "未確認" },
  { icon: CreditCard, label: "お支払い・プラン", href: "/settings/payment", ownerOnly: true },
  { icon: HelpCircle, label: "ヘルプ・FAQ", href: "/faq" },
];


interface FollowedOrganizer {
  id: string;
  orgName: string;
  openEvent: { id: string; title: string; startAt: string; area: string } | null;
}

interface EventThreadSummary {
  id: string;
  role: "vendor" | "organizer";
  kind: string;
  eventTitle: string;
  counterpartName: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: boolean;
}

export default function MyPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("favorites");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mySpaces, setMySpaces] = useState<Space[]>([]);
  const [myStores, setMyStores] = useState<StoreData[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  // 主催者かどうかは userType とは別軸（OrganizerProfile）。
  // スペースオーナーでも出店者でも申請でき、運営の承認で募集を公開できる。
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<MyEventData[]>([]);
  // 出店募集のやり取り。応募スレッドが募集ページの下にしか無く、どこに届くのか
  // 分からないという声があったので、マイページにも未読を出す（2026-08-27 MTG）。
  const [eventThreads, setEventThreads] = useState<EventThreadSummary[]>([]);
  // フォロー中の主催者。次の募集が公開されたら通知が届く。
  const [followedOrganizers, setFollowedOrganizers] = useState<FollowedOrganizer[]>([]);
  const [stats, setStats] = useState({ favorites: 0, messages: 0, bookings: 0, reviews: 0, spaces: 0, stores: 0, checkIns: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);

  const needsEmailVerification = session?.user && !session.user.emailVerified;

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) {
        setVerificationResent(true);
      }
    } catch {
      // silently fail
    } finally {
      setIsResendingVerification(false);
    }
  };

  // ユーザーの役割をチェック
  const userTypes = profile?.userTypes || [];
  const isVendor = userTypes.includes("vendor");
  const isOwner = userTypes.includes("owner");

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user) return;
      setIsLoading(true);

      try {
        const [profileRes, favoritesRes, bookingsRes, reviewsRes, checkInsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/favorites"),
          fetch("/api/bookings"),
          fetch(`/api/reviews?targetId=${session.user.id}`),
          fetch("/api/checkins"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);

          // オーナー役割を持っている場合は自分のスペースも取得
          const types = profileData.userTypes || [];
          if (types.includes("owner")) {
            const spacesRes = await fetch("/api/spaces/my");
            if (spacesRes.ok) {
              const spacesData = await spacesRes.json();
              setMySpaces(spacesData);
              setStats(prev => ({ ...prev, spaces: spacesData.length }));
            }
          }

          // 出店者役割を持っている場合は自分の店舗も取得
          if (types.includes("vendor")) {
            const storesRes = await fetch("/api/stores/my");
            if (storesRes.ok) {
              const storesData = await storesRes.json();
              setMyStores(storesData);
              setStats(prev => ({ ...prev, stores: storesData.length }));
            }
          }

          // 初期タブを設定
          if (types.includes("owner") && !types.includes("vendor")) {
            setActiveTab("spaces");
          } else if (types.includes("vendor")) {
            setActiveTab("stores");
          } else {
            setActiveTab("favorites");
          }
        }

        if (favoritesRes.ok) {
          const favoritesData = await favoritesRes.json();
          setFavorites(favoritesData);
          setStats(prev => ({ ...prev, favorites: favoritesData.length }));
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
          setStats(prev => ({ ...prev, bookings: bookingsData.length }));
        }

        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData.reviews || []);
          setStats(prev => ({ ...prev, reviews: reviewsData.total || 0 }));
        }

        if (checkInsRes.ok) {
          const checkInsData = await checkInsRes.json();
          setCheckIns(checkInsData.checkIns || []);
          setStats(prev => ({ ...prev, checkIns: checkInsData.total || 0 }));
        }

        // 主催者プロフィールと自分の募集。主催者でなければ organizer が null で返る。
        try {
          const eventsRes = await fetch("/api/events/my");
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            setOrganizerStatus(eventsData.organizer?.status ?? null);
            setMyEvents(eventsData.events ?? []);
          }
        } catch {
          // silent
        }

        // 出店募集のやり取り。出店者としての応募も、主催者として受けた応募も入る。
        try {
          const threadsRes = await fetch("/api/messages/threads");
          if (threadsRes.ok) {
            const threadsData = await threadsRes.json();
            setEventThreads(threadsData.threads ?? []);
          }
        } catch {
          // silent
        }

        // フォロー中の主催者
        try {
          const followRes = await fetch("/api/organizers/following");
          if (followRes.ok) {
            const followData = await followRes.json();
            setFollowedOrganizers(followData.organizers ?? []);
          }
        } catch {
          // silent
        }

        // ポイント情報を取得（profileのtotalPoints）
        try {
          const userRes = await fetch("/api/profile/points");
          if (userRes.ok) {
            const userData = await userRes.json();
            setTotalPoints(userData.totalPoints || 0);
          }
        } catch {
          // silent
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const userProfile = {
    name: profile?.displayName || session?.user?.name || "名前未設定",
    email: session?.user?.email || "",
    avatar: profile?.images?.[0]?.url || session?.user?.image || "",
    isVerified: profile?.isVerified || false,
    location: profile?.area || "未設定",
    category: profile?.category || "未設定",
  };

  // 役割表示のラベル
  const getRoleLabel = () => {
    if (isOwner) return "スペースオーナー";
    return "出店者";
  };

  // 主催者は役割とは別に持つので、バッジも導線も分けて出す
  const isOrganizer = organizerStatus === "approved";
  const unreadThreadCount = eventThreads.filter((t) => t.unread).length;
  // 開催が終わったものを下に送る。下書きや中止もカードのバッジで状態が分かる。
  const openEvents = myEvents.filter((e) => !isFinished(e));
  const pastEvents = myEvents.filter((e) => isFinished(e));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {needsEmailVerification && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  メールアドレスが未確認です。確認メール内のリンクをクリックして、アカウントを有効にしてください。
                </p>
              </div>
              {verificationResent ? (
                <span className="text-sm text-green-600 font-medium">送信しました</span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Mail className="h-4 w-4 mr-1" />
                  )}
                  確認メールを再送
                </Button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={userProfile.avatar} />
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-2xl">
                          {userProfile.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                        asChild
                      >
                        <Link href="/profile/edit">
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <h2 className="mt-4 font-bold text-lg text-gray-900">{userProfile.name}</h2>
                    <p className="text-sm text-gray-600">{userProfile.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                      <Badge variant="secondary" className="rounded-full">
                        {getRoleLabel()}
                      </Badge>
                      {isOwner && session?.user?.subscriptionPlan === "premium" && (
                        <Badge className="rounded-full bg-amber-500 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          プレミアム
                        </Badge>
                      )}
                      {isOrganizer && (
                        <Badge className="rounded-full bg-gray-900 text-white hover:bg-gray-900">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          主催者
                        </Badge>
                      )}
                      {organizerStatus === "pending" && (
                        <Badge variant="outline" className="rounded-full text-gray-600">
                          主催者申請 審査中
                        </Badge>
                      )}
                      {!userProfile.isVerified && (
                        <Badge variant="outline" className="rounded-full text-yellow-600 border-yellow-300">
                          未認証
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{userProfile.location}</span>
                    </div>
                    {totalPoints > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 bg-amber-50 rounded-full px-3 py-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm font-bold text-amber-700">{totalPoints} pt</span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {isOwner && (
                      <Link
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActiveTab("spaces"); }}
                        className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <Building2 className="h-5 w-5 text-primary mb-1" />
                        <span className="text-lg font-bold text-gray-900">{stats.spaces}</span>
                        <span className="text-xs text-gray-500">マイスペース</span>
                      </Link>
                    )}
                    {isVendor && (
                      <Link
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActiveTab("stores"); }}
                        className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <Store className="h-5 w-5 text-primary mb-1" />
                        <span className="text-lg font-bold text-gray-900">{stats.stores}</span>
                        <span className="text-xs text-gray-500">マイ店舗</span>
                      </Link>
                    )}
                    {isVendor && (
                      <Link
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActiveTab("favorites"); }}
                        className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <Heart className="h-5 w-5 text-primary mb-1" />
                        <span className="text-lg font-bold text-gray-900">{stats.favorites}</span>
                        <span className="text-xs text-gray-500">お気に入り</span>
                      </Link>
                    )}
                    {isOrganizer && (
                      <Link
                        href="/events/my"
                        className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <CalendarDays className="h-5 w-5 text-primary mb-1" />
                        <span className="text-lg font-bold text-gray-900">{myEvents.length}</span>
                        <span className="text-xs text-gray-500">主催イベント</span>
                      </Link>
                    )}
                    <Link
                      href="/messages"
                      className="relative flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 text-primary mb-1" />
                      <span className="text-lg font-bold text-gray-900">{stats.messages}</span>
                      <span className="text-xs text-gray-500">メッセージ</span>
                      {unreadThreadCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                          {unreadThreadCount > 9 ? "9+" : unreadThreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="#"
                      onClick={(e) => { e.preventDefault(); setActiveTab("bookings"); }}
                      className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <Calendar className="h-5 w-5 text-primary mb-1" />
                      <span className="text-lg font-bold text-gray-900">{stats.bookings}</span>
                      <span className="text-xs text-gray-500">予約・申請</span>
                    </Link>
                    <Link
                      href="#"
                      onClick={(e) => { e.preventDefault(); setActiveTab("reviews"); }}
                      className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <Star className="h-5 w-5 text-primary mb-1" />
                      <span className="text-lg font-bold text-gray-900">{stats.reviews}</span>
                      <span className="text-xs text-gray-500">レビュー</span>
                    </Link>
                    <Link
                      href="#"
                      onClick={(e) => { e.preventDefault(); setActiveTab("checkins"); }}
                      className="flex flex-col items-center p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <QrCode className="h-5 w-5 text-primary mb-1" />
                      <span className="text-lg font-bold text-gray-900">{stats.checkIns}</span>
                      <span className="text-xs text-gray-500">チェックイン</span>
                    </Link>
                  </div>

                  {/* 登録ボタン */}
                  {(isVendor || isOwner || isOrganizer) && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        {isVendor && (
                          <Button asChild className="w-full rounded-full" size="sm">
                            <Link href="/stores/new">
                              <Store className="h-4 w-4 mr-2" />
                              店舗を登録する
                            </Link>
                          </Button>
                        )}
                        {isOwner && (
                          <Button asChild variant="outline" className="w-full rounded-full" size="sm">
                            <Link href="/spaces/new">
                              <Building2 className="h-4 w-4 mr-2" />
                              スペースを登録する
                            </Link>
                          </Button>
                        )}
                        {isOrganizer && (
                          <Button asChild variant="outline" className="w-full rounded-full" size="sm">
                            <Link href="/events/new">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              出店者を募集する
                            </Link>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Menu */}
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="p-4">
                  <nav className="space-y-1">
                    {menuItems.filter((item) => !item.ownerOnly || isOwner).map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                    <Separator className="my-2" />
                    {/* イベント出店募集。応募は出店者、主催は承認された主催者だけの導線。
                        まだ主催者でない人には「はじめる」入口だけを見せる。 */}
                    {isVendor && (
                      <Link
                        href="/events/applications"
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Send className="h-5 w-5 text-gray-900" />
                          <span className="text-sm font-medium text-gray-900">応募した募集</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    )}
                    {isOrganizer && (
                      <Link
                        href="/events/my"
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-5 w-5 text-gray-900" />
                          <span className="text-sm font-medium text-gray-900">主催イベント</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    )}
                    <Link
                      href="/organizer"
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          {organizerStatus === null ? "イベントを主催する" : "主催者情報"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {organizerStatus === "pending" && (
                          <Badge variant="secondary" className="text-xs">審査中</Badge>
                        )}
                        {organizerStatus === "rejected" && (
                          <Badge variant="secondary" className="text-xs">要修正</Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Link>
                    {session?.user?.isAdmin && (
                      <>
                        <Separator className="my-2" />
                        <Link
                          href="/admin"
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <LayoutDashboard className="h-5 w-5 text-gray-900" />
                            <span className="text-sm font-medium text-gray-900">管理者ダッシュボード</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      </>
                    )}
                    <Separator className="my-2" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors w-full text-left text-gray-500"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="text-sm font-medium">ログアウト</span>
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* 出店募集のやり取り。応募スレッドは募集ページの下にしか無いので、
                  ログイン後に真っ先に目に入る場所へ未読を出す（2026-08-27 MTG）。 */}
              {eventThreads.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl bg-white mb-6">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        出店募集のやり取り
                        {unreadThreadCount > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                            未読 {unreadThreadCount}
                          </span>
                        )}
                      </h2>
                      <Link href="/messages" className="text-sm text-gray-500 hover:text-gray-900">
                        すべて見る
                      </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {eventThreads.slice(0, 3).map((thread) => (
                        <Link
                          key={thread.id}
                          href={`/events/applications/${thread.id}`}
                          className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                        >
                          {thread.unread ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          ) : (
                            <span className="h-2 w-2 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm ${
                                thread.unread ? "font-semibold text-gray-900" : "text-gray-900"
                              }`}
                            >
                              {thread.counterpartName}
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                {thread.role === "organizer"
                                ? thread.kind === "scout"
                                  ? "送ったスカウト"
                                  : "受け取った応募"
                                : thread.kind === "scout"
                                  ? "届いたスカウト"
                                  : "応募した募集"}{" "}
                              ・{" "}
                                {thread.eventTitle}
                              </span>
                            </p>
                            {thread.lastMessage && (
                              <p className="truncate text-xs text-gray-500 mt-0.5">
                                {thread.lastMessage}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* フォロー中の主催者。主催者の単独ページは無いので、募集中があれば
                  その募集へ、無ければその旨だけを出す（2026-08-27 決定）。 */}
              {followedOrganizers.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl bg-white mb-6">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                      <Bell className="h-5 w-5 text-primary" />
                      フォロー中の主催者
                      <span className="text-sm font-normal text-gray-500">
                        {followedOrganizers.length}件
                      </span>
                    </h2>
                    <div className="divide-y divide-gray-100">
                      {followedOrganizers.map((o) => (
                        <div key={o.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {o.orgName}
                            </p>
                            {o.openEvent ? (
                              <Link
                                href={`/events/${o.openEvent.id}`}
                                className="mt-0.5 block truncate text-xs text-primary hover:underline"
                              >
                                直近の募集: {o.openEvent.title}
                              </Link>
                            ) : (
                              <p className="mt-0.5 text-xs text-gray-500">
                                今後の募集はまだありません
                              </p>
                            )}
                          </div>
                          {o.openEvent && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      新しい募集が公開されると通知でお知らせします
                    </p>
                  </CardContent>
                </Card>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border border-gray-200 rounded-full p-1 mb-6 flex-wrap h-auto gap-1">
                  {/* 両方の役割を持つ場合はすべてのタブを表示 */}
                  {isOwner && (
                    <TabsTrigger value="spaces" className="rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                      <Building2 className="h-4 w-4 mr-2" />
                      マイスペース
                    </TabsTrigger>
                  )}
                  {isVendor && (
                    <TabsTrigger value="stores" className="rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                      <Store className="h-4 w-4 mr-2" />
                      マイ店舗
                    </TabsTrigger>
                  )}
                  {isVendor && (
                    <TabsTrigger value="favorites" className="rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                      <Heart className="h-4 w-4 mr-2" />
                      お気に入り
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="bookings" className="rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                    <Calendar className="h-4 w-4 mr-2" />
                    予約・申請
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                    <Star className="h-4 w-4 mr-2" />
                    レビュー
                  </TabsTrigger>
                  <TabsTrigger value="checkins" className="rounded-full data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                    <QrCode className="h-4 w-4 mr-2" />
                    チェックイン
                  </TabsTrigger>
                </TabsList>

                {/* My Spaces Tab (Owner only) */}
                {isOwner && (
                  <TabsContent value="spaces" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">マイスペース</h2>
                      <Button className="rounded-full" asChild>
                        <Link href="/spaces/new">
                          <Plus className="h-4 w-4 mr-2" />
                          スペースを登録
                        </Link>
                      </Button>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : mySpaces.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                        <Building2 className="h-12 w-12 mx-auto text-gray-300" />
                        <p className="mt-4 text-gray-500">登録しているスペースはありません</p>
                        <Button asChild className="mt-4 rounded-full">
                          <Link href="/spaces/new">
                            <Plus className="h-4 w-4 mr-2" />
                            スペースを登録する
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mySpaces.map((space) => (
                          <Card
                            key={space.id}
                            className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white"
                          >
                            <div className="flex">
                              <Link href={`/space/${space.id}`} className="relative w-32 h-32 shrink-0 bg-gray-100">
                                {space.images?.[0]?.url ? (
                                  <Image
                                    src={space.images[0].url}
                                    alt={space.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Building2 className="h-8 w-8 text-gray-300" />
                                  </div>
                                )}
                              </Link>
                              <CardContent className="p-4 flex-1">
                                <div className="flex items-start justify-between">
                                  <Link href={`/space/${space.id}`}>
                                    <h3 className="font-bold text-gray-900 line-clamp-1 hover:text-primary">
                                      {space.name}
                                    </h3>
                                  </Link>
                                  <Badge
                                    variant={space.isActive ? "default" : "secondary"}
                                    className="rounded-full text-xs"
                                  >
                                    {space.isActive ? "公開中" : "非公開"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  <span>{space.location}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span>
                                    <Heart className="h-3 w-3 inline mr-1" />
                                    {space._count?.favorites || 0}
                                  </span>
                                  <span>
                                    <Star className="h-3 w-3 inline mr-1" />
                                    {space._count?.reviews || 0}件
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  {space.price && (
                                    <p className="text-sm font-bold text-primary">
                                      {space.price}
                                    </p>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full text-xs h-7"
                                    asChild
                                  >
                                    <Link href={`/spaces/${space.id}/edit`}>
                                      <Edit className="h-3 w-3 mr-1" />
                                      編集
                                    </Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* My Stores Tab (Vendor only) */}
                {isVendor && (
                  <TabsContent value="stores" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">マイ店舗</h2>
                      <Button className="rounded-full" asChild>
                        <Link href="/stores/new">
                          <Plus className="h-4 w-4 mr-2" />
                          店舗を登録
                        </Link>
                      </Button>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : myStores.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                        <Store className="h-12 w-12 mx-auto text-gray-300" />
                        <p className="mt-4 text-gray-500">登録している店舗はありません</p>
                        <Button asChild className="mt-4 rounded-full">
                          <Link href="/stores/new">
                            <Plus className="h-4 w-4 mr-2" />
                            店舗を登録する
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myStores.map((store) => (
                          <Card
                            key={store.id}
                            className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white"
                          >
                            <div className="flex">
                              <div className="relative w-32 h-32 shrink-0 bg-gray-100">
                                {store.images?.[0]?.url ? (
                                  <Image
                                    src={store.images[0].url}
                                    alt={store.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Store className="h-8 w-8 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <CardContent className="p-4 flex-1">
                                <div className="flex items-start justify-between">
                                  <h3 className="font-bold text-gray-900 line-clamp-1">
                                    {store.name}
                                  </h3>
                                  <Badge
                                    variant={store.isActive ? "default" : "secondary"}
                                    className="rounded-full text-xs"
                                  >
                                    {store.isActive ? "公開中" : "非公開"}
                                  </Badge>
                                </div>
                                {store.category && (
                                  <Badge variant="outline" className="rounded-full text-xs mt-2">
                                    {store.category}
                                  </Badge>
                                )}
                                {store.area && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    <span>{store.area}</span>
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full text-xs h-7"
                                    asChild
                                  >
                                    <Link href={`/store/${store.id}`} target="_blank">
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      プレビュー
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full text-xs h-7"
                                    asChild
                                  >
                                    <Link href={`/stores/${store.id}/edit`}>
                                      <Edit className="h-3 w-3 mr-1" />
                                      編集
                                    </Link>
                                  </Button>
                                </div>
                                {/* 出店申込パック：主催者への送付導線 */}
                                <div className="flex flex-wrap items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-xs h-7"
                                    asChild
                                  >
                                    <Link href={`/stores/${store.id}/application`}>
                                      <ClipboardList className="h-3 w-3 mr-1" />
                                      出店申込情報
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-xs h-7 text-orange-600 hover:text-orange-700"
                                    asChild
                                  >
                                    <Link href={`/stores/${store.id}/share-links`}>
                                      <Share2 className="h-3 w-3 mr-1" />
                                      共有リンク
                                    </Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Favorites Tab */}
                {isVendor && (
                  <TabsContent value="favorites" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">お気に入り一覧</h2>
                    </div>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                        <Heart className="h-12 w-12 mx-auto text-gray-300" />
                        <p className="mt-4 text-gray-500">お気に入りはまだありません</p>
                        <Button asChild className="mt-4 rounded-full">
                          <Link href="/search?type=space">スペースを探す</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {favorites.map((fav) => (
                          <Card
                            key={fav.id}
                            className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white"
                          >
                            <Link href={`/space/${fav.space.id}`}>
                              <div className="flex">
                                <div className="relative w-32 h-32 shrink-0 bg-gray-100">
                                  {fav.space.images?.[0]?.url && (
                                    <Image
                                      src={fav.space.images[0].url}
                                      alt={fav.space.name}
                                      fill
                                      className="object-cover"
                                    />
                                  )}
                                </div>
                                <CardContent className="p-4 flex-1">
                                  <h3 className="font-bold text-gray-900 line-clamp-1">
                                    {fav.space.name}
                                  </h3>
                                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    <span>{fav.space.location}</span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-2">
                                    <span className="text-xs text-gray-500">
                                      ({fav.space._count?.reviews || 0}件のレビュー)
                                    </span>
                                  </div>
                                  {fav.space.price && (
                                    <p className="mt-2 text-sm font-bold text-primary">
                                      {fav.space.price}
                                    </p>
                                  )}
                                </CardContent>
                              </div>
                            </Link>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Bookings Tab */}
                <TabsContent value="bookings" className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">予約・申請履歴</h2>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                      <Calendar className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-4 text-gray-500">予約・申請履歴はまだありません</p>
                      {isVendor && (
                        <Button asChild className="mt-4 rounded-full">
                          <Link href="/search?type=space">スペースを探す</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <Card
                          key={booking.id}
                          className="border-0 shadow-sm rounded-2xl bg-white"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                                <Calendar className="h-8 w-8 text-gray-300" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-bold text-gray-900">
                                      {booking.space?.name || "スペース"}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      出店希望日: {new Date(booking.date).toLocaleDateString("ja-JP")}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      booking.status === "confirmed"
                                        ? "default"
                                        : booking.status === "pending"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className="rounded-full"
                                  >
                                    {booking.status === "confirmed"
                                      ? "確定"
                                      : booking.status === "pending"
                                      ? "申請中"
                                      : booking.status === "cancelled"
                                      ? "キャンセル"
                                      : "完了"}
                                  </Badge>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  {booking.status === "confirmed" && (
                                    <Button
                                      size="sm"
                                      className="rounded-full"
                                      asChild
                                    >
                                      <Link href="/messages">
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        メッセージ
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">いただいたレビュー</h2>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-500">({stats.reviews}件)</span>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                      <Star className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-4 text-gray-500">レビューはまだありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <Card
                          key={review.id}
                          className="border-0 shadow-sm rounded-2xl bg-white"
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={review.author.image || ""} />
                                <AvatarFallback className="bg-gray-100 text-gray-600">
                                  {review.author.name?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-gray-900">{review.author.name || "ユーザー"}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(review.createdAt).toLocaleDateString("ja-JP")}
                                  </p>
                                </div>
                                <div className="flex gap-0.5 mt-1">
                                  {[...Array(review.rating)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                    />
                                  ))}
                                </div>
                                {review.content && (
                                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                                    {review.content}
                                  </p>
                                )}
                                {review.space && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    スペース: {review.space.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Check-ins Tab */}
                <TabsContent value="checkins" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">チェックイン履歴</h2>
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-primary" />
                      <span className="text-gray-500">({stats.checkIns}件)</span>
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : checkIns.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                      <QrCode className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-4 text-gray-500">チェックイン履歴はまだありません</p>
                      <p className="mt-2 text-sm text-gray-400">店舗のQRコードをスキャンしてチェックインしましょう!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {checkIns.map((checkIn) => (
                        <Card
                          key={checkIn.id}
                          className="border-0 shadow-sm rounded-2xl bg-white"
                        >
                          <Link href={`/store/${checkIn.store.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                  {checkIn.store.images?.[0]?.url ? (
                                    <Image
                                      src={checkIn.store.images[0].url}
                                      alt={checkIn.store.name}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <Store className="h-6 w-6 text-gray-300" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 truncate">
                                    {checkIn.store.name}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    {checkIn.store.area && (
                                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {checkIn.store.area}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs text-gray-500">
                                    {new Date(checkIn.createdAt).toLocaleDateString("ja-JP")}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(checkIn.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* 主催イベント。マイスペース／マイ店舗の下に、募集中と過去実施を分けて並べる。 */}
              {isOrganizer && (
                <div className="mt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">主催イベント</h2>
                    <Button className="rounded-full" asChild>
                      <Link href="/events/new">
                        <Plus className="h-4 w-4 mr-2" />
                        募集をつくる
                      </Link>
                    </Button>
                  </div>

                  {myEvents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                      <CalendarDays className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-4 text-gray-500">まだ募集がありません</p>
                      <Button asChild className="mt-4 rounded-full">
                        <Link href="/events/new">
                          <Plus className="h-4 w-4 mr-2" />
                          募集をつくる
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900">
                          募集中のイベント
                          <span className="ml-2 font-normal text-gray-500">{openEvents.length}件</span>
                        </h3>
                        {openEvents.length === 0 ? (
                          <p className="text-sm text-gray-500 bg-white rounded-2xl shadow-sm p-6">
                            開催予定のイベントはありません
                          </p>
                        ) : (
                          <ul className="space-y-3">
                            {openEvents.map((e) => (
                              <li key={e.id}>
                                <MyEventCard event={e} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {pastEvents.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-gray-900">
                            過去に実施したイベント
                            <span className="ml-2 font-normal text-gray-500">{pastEvents.length}件</span>
                          </h3>
                          <ul className="space-y-3">
                            {pastEvents.map((e) => (
                              <li key={e.id}>
                                <MyEventCard event={e} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
