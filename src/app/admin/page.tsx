"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  HelpCircle,
  ShieldCheck,
  CreditCard,
  Loader2,
  ArrowLeft,
  ChevronRight,
  LayoutDashboard,
  Store,
  UserCog,
  FileText,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  preRegistrations: number;
  faqItems: number;
  pendingVerifications: number;
  activeSubscriptions: number;
  stores: { total: number; assigned: number; unassigned: number };
  users: number;
  blogPosts: number;
  pendingClaimRequests: number;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    preRegistrations: 0,
    faqItems: 0,
    pendingVerifications: 0,
    activeSubscriptions: 0,
    stores: { total: 0, assigned: 0, unassigned: 0 },
    users: 0,
    blogPosts: 0,
    pendingClaimRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [preRegRes, faqRes, verificationRes, subscriptionsRes, storesRes, usersRes, blogRes, claimReqRes] = await Promise.all([
          fetch("/api/admin/pre-registrations").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/faq").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/verification").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/subscriptions").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/stores").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/users").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/blog").then((r) => r.ok ? r.json() : null),
          fetch("/api/admin/claim-requests?status=pending").then((r) => r.ok ? r.json() : null),
        ]);

        setStats({
          preRegistrations: preRegRes?.stats?.total ?? 0,
          faqItems: Array.isArray(faqRes) ? faqRes.length : 0,
          pendingVerifications: Array.isArray(verificationRes)
            ? verificationRes.filter((r: { status: string }) => r.status === "pending").length
            : 0,
          activeSubscriptions: subscriptionsRes?.stats?.active ?? 0,
          stores: storesRes?.stats ?? { total: 0, assigned: 0, unassigned: 0 },
          users: Array.isArray(usersRes) ? usersRes.length : 0,
          blogPosts: Array.isArray(blogRes) ? blogRes.length : 0,
          pendingClaimRequests: claimReqRes?.stats?.pending ?? 0,
        });
      } catch {
        setError("データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const adminMenuItems = [
    {
      icon: Users,
      label: "先行登録一覧",
      description: "先行登録ユーザーの管理・CSVエクスポート",
      href: "/admin/pre-registrations",
      stat: stats.preRegistrations,
      statLabel: "件の登録",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      icon: HelpCircle,
      label: "FAQ管理",
      description: "よくある質問の作成・編集・公開設定",
      href: "/admin/faq",
      stat: stats.faqItems,
      statLabel: "件のFAQ",
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      icon: ShieldCheck,
      label: "本人確認管理",
      description: "ユーザーの本人確認申請の承認・却下",
      href: "/admin/verification",
      stat: stats.pendingVerifications,
      statLabel: "件の申請待ち",
      color: "text-green-500",
      bgColor: "bg-green-50",
      highlight: stats.pendingVerifications > 0,
    },
    {
      icon: CreditCard,
      label: "サブスクリプション管理",
      description: "有料プランの加入状況・ステータス確認",
      href: "/admin/subscriptions",
      stat: stats.activeSubscriptions,
      statLabel: "件の有効プラン",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      highlight: false,
    },
    {
      icon: Store,
      label: "店舗管理",
      description: "店舗の作成・オーナー紐付け・管理",
      href: "/admin/stores",
      stat: stats.stores.total,
      statLabel: `件（未紐付: ${stats.stores.unassigned}）`,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      highlight: stats.stores.unassigned > 0,
    },
    {
      icon: Handshake,
      label: "店舗引き継ぎ申請",
      description: "既存店舗の引き継ぎ申請の承認・却下",
      href: "/admin/claim-requests",
      stat: stats.pendingClaimRequests,
      statLabel: "件の審査待ち",
      color: "text-teal-500",
      bgColor: "bg-teal-50",
      highlight: stats.pendingClaimRequests > 0,
    },
    {
      icon: UserCog,
      label: "ユーザー管理",
      description: "登録ユーザーの一覧・検索・権限確認",
      href: "/admin/users",
      stat: stats.users,
      statLabel: "人のユーザー",
      color: "text-sky-500",
      bgColor: "bg-sky-50",
    },
    {
      icon: FileText,
      label: "ブログ管理",
      description: "運営ブログ記事の作成・編集・公開設定",
      href: "/admin/blog",
      stat: stats.blogPosts,
      statLabel: "件の記事",
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/mypage">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">管理者ダッシュボード</h1>
                <p className="text-sm text-gray-600">
                  {session?.user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        {/* Admin Menu */}
        <div className="space-y-4">
          {adminMenuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card
                className={`border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow cursor-pointer ${
                  item.highlight ? "ring-2 ring-green-200" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0`}
                    >
                      <item.icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">{item.label}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            <span className="font-bold text-gray-900">{item.stat}</span>{" "}
                            {item.statLabel}
                          </span>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
