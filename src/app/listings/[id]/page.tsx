import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CalendarDays, MapPin, Building2, ExternalLink, Info } from "lucide-react";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatDateShort } from "@/lib/eventFormat";
import { eventJsonLd, formatMonthDay, jsonLdString, listingThumbnailPath } from "@/lib/eventListing";
import { siteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

async function getListing(id: string) {
  return prisma.eventListing.findUnique({ where: { id } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.status !== "published") return { title: "イベントが見つかりません" };

  // 「◯◯マルシェ 11/22(土)｜船橋市のイベント」。イベント名で探す人に、日付と場所がすぐ分かるように
  const title = `${listing.title} ${formatMonthDay(listing.startAt)}｜${listing.city}のイベント`;
  const description = `${formatEventDate(listing.startAt, listing.endAt)}、${listing.city}・${listing.venueName}で開催。${listing.description ?? ""}`.trim();
  const ended = listing.endAt < new Date();
  const image = `${siteUrl("https://tenmusubi.net")}${listingThumbnailPath(listing)}`;

  return {
    title,
    description,
    // 終わったイベントは検索結果に出さない
    robots: ended ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      locale: "ja_JP",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 text-orange-500 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm font-medium text-gray-900 break-words">{children}</div>
      </div>
    </div>
  );
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  // 主催者が引き取って出店募集にしたら、そちらへ移す（検索の評価も引き継ぐ）
  if (listing.claimedEventId) permanentRedirect(`/events/${listing.claimedEventId}`);

  if (listing.status !== "published") {
    const session = await auth();
    const viewerId = session?.user?.id;
    if (!viewerId || !(await isAdmin(viewerId))) notFound();
  }

  const ended = listing.endAt < new Date();
  const jsonLd = eventJsonLd({
    name: listing.title,
    description: listing.description,
    startAt: listing.startAt,
    endAt: listing.endAt,
    venueName: listing.venueName,
    address: listing.address,
    area: listing.area,
    city: listing.city,
    url: `${siteUrl("https://tenmusubi.net")}/listings/${listing.id}`,
    organizerName: listing.organizerName,
    image: `${siteUrl("https://tenmusubi.net")}${listingThumbnailPath(listing)}`,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      {!ended && listing.status === "published" && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      )}

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/calendar" className="text-sm text-gray-600 hover:text-gray-900">
            ← 千葉の開催カレンダー
          </Link>

          {listing.status !== "published" && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              この掲載は取り下げています（運営だけが見られます）。
            </div>
          )}

          <header className="mt-4 mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline">運営が掲載</Badge>
              {ended && <Badge variant="outline">終了しました</Badge>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">{listing.title}</h1>
            {listing.organizerName && (
              <p className="mt-3 text-sm text-gray-600">主催 {listing.organizerName}</p>
            )}
          </header>

          {listing.status === "published" && (
            // 運営が作った画像（情報元の写真は使わない）
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listingThumbnailPath(listing)}
              alt=""
              width={1200}
              height={630}
              className="mb-6 w-full rounded-xl bg-orange-50 aspect-[40/21] object-cover"
            />
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-4">
            <div className="divide-y divide-gray-100">
              <Row icon={<CalendarDays className="h-5 w-5" />} label="開催日時">
                {formatEventDate(listing.startAt, listing.endAt)}
              </Row>
              <Row icon={<MapPin className="h-5 w-5" />} label="会場">
                {listing.venueName}
                <span className="block text-xs font-normal text-gray-600 mt-0.5">
                  {listing.address || `${listing.area}${listing.city}`}
                </span>
              </Row>
              {listing.organizerName && (
                <Row icon={<Building2 className="h-5 w-5" />} label="主催">
                  {listing.organizerName}
                </Row>
              )}
            </div>
            {listing.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{listing.description}</p>
            )}
            <div className="mt-5">
              <Button variant="outline" className="w-full rounded-full" asChild>
                <a href={listing.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                  詳しい情報を見る（情報元）
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-4 text-sm text-gray-700">
            <p className="flex gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
              <span>
                てんむすびの運営が、公開されている情報をもとに掲載しています。主催者の公式ページではありません。
                日程や内容が変わることがあるので、お出かけの前に情報元でご確認ください。
                <span className="block mt-1 text-xs text-gray-500">
                  最終確認日 {formatDateShort(listing.checkedAt)}
                </span>
              </span>
            </p>
          </section>

          <section className="rounded-2xl bg-orange-50 p-5 sm:p-6 text-sm text-gray-700">
            <h2 className="font-bold text-gray-900 mb-2">このイベントの主催者の方へ</h2>
            <p>
              てんむすびでは、このページから出店者（キッチンカー・ハンドメイドなど）を募集できます。
              募集・書類の回収・出店料の受け取りまで、てんむすびで完結します。
              掲載内容の修正や、掲載の取り下げのご依頼もお受けしています。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="rounded-full" asChild>
                <Link href="/for/organizers">出店者を募集する</Link>
              </Button>
              <Button variant="outline" className="rounded-full bg-white" asChild>
                <Link href="/contact">修正・取り下げを依頼する</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
