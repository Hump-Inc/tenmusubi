import Link from "next/link";
import { Instagram, Twitter } from "lucide-react";
import { Logo } from "@/components/common/Logo";

const footerLinks = {
  categories: [
    { name: "キッチンカー", href: "/search?type=vendor&category=キッチンカー" },
    { name: "ハンドメイドショップ", href: "/search?type=vendor&category=ハンドメイドショップ" },
    { name: "その他の出店者", href: "/search?type=vendor&category=その他" },
    { name: "すべての出店者", href: "/search?type=vendor" },
  ],
  owner: [
    { name: "出店先を探す", href: "/search?type=space" },
    { name: "スペースを提供する", href: "/register?type=owner" },
  ],
  support: [
    { name: "ブログ", href: "/blog" },
    { name: "よくある質問", href: "/faq" },
    { name: "お問い合わせ", href: "/contact" },
    { name: "ご利用ガイド", href: "/guide" },
    { name: "運営会社", href: "/company" },
  ],
  legal: [
    { name: "利用規約", href: "/tos" },
    { name: "プライバシーポリシー", href: "/privacy" },
    { name: "特定商取引法に基づく表記", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} animate={false} />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">てんむすび</span>
                <span className="text-xs text-gray-400">出店者ポータルサイト</span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              キッチンカーやハンドメイドショップなど、
              さまざまな出店者を検索できる
              ポータルサイト。
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Category Links */}
          <div>
            <h3 className="font-bold text-white mb-4">出店者を探す</h3>
            <ul className="space-y-3">
              {footerLinks.categories.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Owner Links */}
          <div>
            <h3 className="font-bold text-white mb-4">スペースオーナーの方へ</h3>
            <ul className="space-y-3">
              {footerLinks.owner.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-bold text-white mb-4">サポート</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-white mb-4">規約・ポリシー</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust Message */}
        <div className="mt-12 rounded-2xl bg-gray-800 p-6 text-center">
          <p className="text-sm text-gray-400">
            てんむすびは、安心・安全なマッチングを心がけています。
            本人確認済みユーザーのみが利用でき、トラブル時のサポート体制も整っています。
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 md:flex-row">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} てんむすび. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            キッチンカー・ハンドメイドショップの出店者ポータルサイト
          </p>
        </div>
      </div>
    </footer>
  );
}
