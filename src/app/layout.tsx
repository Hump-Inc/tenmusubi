import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { VercelAnalytics } from "@/components/providers/VercelAnalytics";
import "./globals.css";

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "てんむすび - 出店者ポータルサイト",
  description:
    "てんむすびは、キッチンカー・ハンドメイドショップなどの出店者を検索できるポータルサイトです。イベントや催事にぴったりの出店者が見つかります。",
  keywords: ["出店者", "キッチンカー", "ハンドメイドショップ", "ポータル", "マルシェ", "イベント"],
  openGraph: {
    title: "てんむすび - 出店者ポータルサイト",
    description:
      "キッチンカー・ハンドメイドショップなどの出店者を検索できるポータルサイト",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${zenMaruGothic.className} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <VercelAnalytics />
      </body>
    </html>
  );
}
