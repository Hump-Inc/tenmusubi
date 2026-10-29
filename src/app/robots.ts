import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl("https://tenmusubi.net");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 共有リンク・引き継ぎ・ログイン後の画面は検索に出さない
      disallow: [
        "/api/",
        "/admin",
        "/s/",
        "/stores/",
        "/spaces/",
        "/checkin/",
        "/events/new",
        "/events/my",
        "/events/applications",
        "/events/*/apply",
        "/events/*/applications",
        "/events/*/edit",
        "/events/*/scout",
        "/mypage",
        "/messages",
        "/settings",
        "/profile",
        "/organizer",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
