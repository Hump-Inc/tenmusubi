import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/siteUrl";
import { boshuPath, countByPrefecture, getOpenRecruitments } from "@/lib/boshu";

// 1時間ごとに作り直す（新しい店舗・募集・記事を拾うため）
export const revalidate = 3600;

const STATIC_PATHS = [
  "",
  "/for/vendors",
  "/for/spaces",
  "/for/organizers",
  "/guide/organizers",
  "/boshu",
  "/search",
  "/calendar",
  "/ranking",
  "/blog",
  "/faq",
  "/contact",
  "/terms",
  "/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl("https://tenmusubi.net");

  // 公開中のものだけ。下書き・非公開・締切後（募集ページは noindex）は載せない
  const now = new Date();
  const [stores, spaces, events, posts, listings, openRecruitments] = await Promise.all([
    prisma.store.findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } }),
    prisma.space.findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } }),
    prisma.event.findMany({ where: { status: "published" }, select: { id: true, updatedAt: true } }),
    prisma.blogPost.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    // 運営が載せたイベント。終わったものは noindex なので載せない
    prisma.eventListing.findMany({
      where: { status: "published", claimedEventId: null, endAt: { gte: now } },
      select: { id: true, updatedAt: true },
    }),
    // 都道府県ごとの出店募集一覧。募集が無い県のページは noindex なので載せない
    getOpenRecruitments(),
  ]);

  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
    ...countByPrefecture(openRecruitments).map((p) => ({ url: `${base}${boshuPath(p.prefecture)}` })),
    ...stores.map((s) => ({ url: `${base}/store/${s.id}`, lastModified: s.updatedAt })),
    ...spaces.map((s) => ({ url: `${base}/space/${s.id}`, lastModified: s.updatedAt })),
    ...events.map((e) => ({ url: `${base}/events/${e.id}`, lastModified: e.updatedAt })),
    ...listings.map((l) => ({ url: `${base}/listings/${l.id}`, lastModified: l.updatedAt })),
    ...posts.map((p) => ({ url: `${base}/blog/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt })),
  ];
}
