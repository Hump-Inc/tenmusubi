"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, User, MessageCircle, Search, ArrowRight, Bell, LayoutDashboard, Trophy } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";

// 業種で並べるより「何を探しに来たか」で分けた方が迷わない、という
// 出店者側からの指摘で目的別にした（2026-08-27 MTG）。
const navigation = [
  { name: "出店者を探す", href: "/search?type=vendor" },
  { name: "出店場所を探す", href: "/search?type=space" },
  { name: "出店募集を探す", href: "/search?type=event" },
  { name: "ランキング", href: "/ranking" },
];

export function Header() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // セッションの状態からログイン状態を判定
  const isLoggedIn = status === "authenticated" && !!session;

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.images?.[0]?.url) {
          setProfileImageUrl(data.images[0].url);
        }
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // メッセージの未読。DMと出店募集のやり取りを合わせた数を1回の取得で出す。
  // 応募のやり取りがDMと別の場所に届くのが分かりにくかったため（2026-08-27 MTG）。
  useEffect(() => {
    if (!isLoggedIn) return;
    const load = () =>
      fetch("/api/messages/threads")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setUnreadMessages((data.unreadThreads ?? 0) + (data.unreadDirect ?? 0));
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const avatarSrc = profileImageUrl || session?.user?.image || "";

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="container mx-auto flex h-24 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-4">
          <Logo size={72} />
          <div className="flex flex-col">
            <span className="text-3xl font-bold tracking-wide text-[#d35f2d]">てんむすび</span>
            <span className="text-xs text-[#8b7355] tracking-wider">出店者ポータルサイト</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="icon" className="rounded-full text-gray-600 hover:text-gray-900" asChild>
                <Link href="/search">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-gray-600 hover:text-gray-900 relative"
                asChild
              >
                <Link href="/messages">
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
              </Button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarSrc} alt="ユーザー" />
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {session?.user?.name?.[0] || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/mypage" className="cursor-pointer">
                      マイページ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/edit" className="cursor-pointer">
                      プロフィール編集
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="cursor-pointer justify-between">
                      メッセージ
                      {unreadMessages > 0 && (
                        <span className="ml-2 rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/notifications" className="cursor-pointer">
                      通知設定
                    </Link>
                  </DropdownMenuItem>
                  {session?.user?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        管理者ダッシュボード
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-gray-500"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900" asChild>
                <Link href="/login">ログイン</Link>
              </Button>
              <Button className="rounded-full bg-gray-900 hover:bg-gray-800 text-white px-6" asChild>
                <Link href="/register">
                  無料会員登録
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="h-5 w-5" />
              <span className="sr-only">メニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-white">
            <div className="flex flex-col gap-6 pt-6">
              <Link href="/" className="flex items-center gap-4" onClick={() => setOpen(false)}>
                <Logo size={72} />
                <div className="flex flex-col">
                  <span className="text-3xl font-bold tracking-wide text-[#d35f2d]">てんむすび</span>
                  <span className="text-xs text-[#8b7355] tracking-wider">出店者ポータルサイト</span>
                </div>
              </Link>

              <nav className="flex flex-col gap-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-lg font-medium text-gray-600 transition-colors hover:text-gray-900"
                    onClick={() => setOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/mypage"
                      className="text-lg font-medium text-gray-900"
                      onClick={() => setOpen(false)}
                    >
                      マイページ
                    </Link>
                    <Link
                      href="/messages"
                      className="flex items-center gap-2 text-lg font-medium text-gray-900"
                      onClick={() => setOpen(false)}
                    >
                      メッセージ
                      {unreadMessages > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </Link>
                    <Button
                      variant="outline"
                      className="rounded-full mt-2 border-gray-200"
                      onClick={() => {
                        setOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                    >
                      ログアウト
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="rounded-full border-gray-200" asChild>
                      <Link href="/login" onClick={() => setOpen(false)}>
                        ログイン
                      </Link>
                    </Button>
                    <Button className="rounded-full bg-gray-900 hover:bg-gray-800" asChild>
                      <Link href="/register" onClick={() => setOpen(false)}>
                        無料会員登録
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
