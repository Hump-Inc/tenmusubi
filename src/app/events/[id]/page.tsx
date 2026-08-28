import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Coins,
  Users,
  Zap,
  Droplets,
  Flame,
  Ruler,
  Clock,
  FileText,
  Building2,
  Globe,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentTypeLabel } from "@/lib/constants";
import {
  formatEventDate,
  formatDateShort,
  formatFee,
  isAcceptingApplications,
  parseJsonArray,
} from "@/lib/eventFormat";
import { feeTierLabel } from "@/lib/eventFeeTiers";
import { SHOW_ORGANIZER_PAST_EVENTS } from "@/lib/constants";
import { OrganizerFollowButton } from "@/components/events/OrganizerFollowButton";
import { EventFavoriteButton } from "@/components/events/EventFavoriteButton";

export const dynamic = "force-dynamic";

async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, userId: true, orgName: true, intro: true, website: true },
      },
      images: { orderBy: { order: "asc" } },
      feeTiers: { orderBy: { order: "asc" } },
      _count: { select: { applications: true } },
    },
  });
}

// 出店者はSNSや検索で募集を探しているので、検索結果とSNSカードに載るようにする
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "募集が見つかりません" };

  const title = `${event.title}｜出店者募集`;
  const description = `${event.area}・${event.venueName}／${formatEventDate(event.startAt, event.endAt)}／出展料 ${formatFee(event.exhibitFee, null, event.exhibitFeeMax)}。キッチンカー・出店者を募集しています。`;

  return {
    title,
    description,
    // 下書きや中止の募集は検索結果に出さない
    robots: event.status === "published" ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "article",
      locale: "ja_JP",
      images: event.images[0] ? [{ url: event.images[0].url }] : undefined,
    },
  };
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  const isOwner = !!viewerId && event.organizer.userId === viewerId;
  const canPreview = isOwner || (!!viewerId && (await isAdmin(viewerId)));

  // 自分の店舗がすでに応募していれば、二重に応募させずやり取りへ案内する
  const myApplication = viewerId
    ? await prisma.eventApplication.findFirst({
        where: { eventId: event.id, store: { ownerId: viewerId } },
        select: { id: true, status: true, store: { select: { name: true } } },
      })
    : null;

  // 下書き・中止は関係者だけが見られる
  if (event.status !== "published" && event.status !== "closed" && !canPreview) {
    notFound();
  }

  // 主催者の情報は募集ページの中で完結させる（単独の主催者ページは作らない、2026-08-27 決定）。
  const now = new Date();
  const [followerCount, myFollow, otherOpenEvents, pastEvents] = await Promise.all([
    prisma.organizerFollow.count({ where: { organizerId: event.organizer.id } }),
    viewerId
      ? prisma.organizerFollow.findUnique({
          where: {
            userId_organizerId: { userId: viewerId, organizerId: event.organizer.id },
          },
          select: { id: true },
        })
      : null,
    prisma.event.findMany({
      where: {
        organizerId: event.organizer.id,
        id: { not: event.id },
        status: "published",
        startAt: { gte: now },
      },
      orderBy: { startAt: "asc" },
      take: 3,
      select: { id: true, title: true, startAt: true, area: true },
    }),
    // 実績は既定で出さない。出すかどうかは検証してから決める。
    SHOW_ORGANIZER_PAST_EVENTS
      ? prisma.event.findMany({
          where: {
            organizerId: event.organizer.id,
            id: { not: event.id },
            status: { in: ["published", "closed"] },
            startAt: { lt: now },
          },
          orderBy: { startAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            startAt: true,
            area: true,
            _count: { select: { applications: true } },
          },
        })
      : [],
  ]);

  const myFavorite = viewerId
    ? await prisma.eventFavorite.findUnique({
        where: { userId_eventId: { userId: viewerId, eventId: event.id } },
        select: { id: true },
      })
    : null;

  const { accepting, reason } = isAcceptingApplications(event);
  const categories = parseJsonArray(event.categories);
  const requiredDocuments = parseJsonArray(event.requiredDocuments);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {canPreview && event.status !== "published" && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                {event.status === "draft"
                  ? "この募集は下書きです。まだ出店者には表示されていません。"
                  : "この募集は中止になっています。"}
              </p>
              <Button size="sm" variant="outline" className="rounded-full" asChild>
                <Link href={`/events/${event.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  編集
                </Link>
              </Button>
            </div>
          )}

          <header className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                出店者募集
              </Badge>
              {categories.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
              {event.title}
            </h1>
            <p className="mt-3 text-sm text-gray-600">主催 {event.organizer.orgName}</p>
          </header>

          {event.images.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-2">
              {event.images.slice(0, 4).map((img, i) => (
                <div
                  key={img.id}
                  className={`relative overflow-hidden rounded-xl bg-gray-100 ${
                    i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 出店者が最初に見る条件 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-4">
            <div className="divide-y divide-gray-100">
              <Row icon={<CalendarDays className="h-5 w-5" />} label="開催日時">
                {formatEventDate(event.startAt, event.endAt)}
              </Row>
              <Row icon={<MapPin className="h-5 w-5" />} label="会場">
                {event.venueName}
                <span className="block text-xs font-normal text-gray-600 mt-0.5">
                  {event.address || event.area}
                </span>
              </Row>
              <Row icon={<Coins className="h-5 w-5" />} label="出展料">
                {event.feeTiers.length > 1 ? (
                  // 区画ごとの実額を並べる。幅だけ見せるより、どの区画がいくらか
                  // 分かる方が出店者は判断しやすい（2026-08-27 MTG）。
                  <div className="space-y-2">
                    <ul className="divide-y divide-gray-100">
                      {event.feeTiers.map((tier) => (
                        <li key={tier.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                          <span className="min-w-0 flex-1 text-sm text-gray-700">
                            {feeTierLabel(tier.label)}
                            {(tier.widthM || tier.depthM) && (
                              <span className="ml-1.5 text-xs font-normal text-gray-500">
                                {tier.widthM ?? "—"}m × {tier.depthM ?? "—"}m
                              </span>
                            )}
                            {tier.slots !== null && (
                              <span className="ml-1.5 text-xs font-normal text-gray-500">
                                {tier.slots}枠
                              </span>
                            )}
                          </span>
                          <span className="text-base tabular-nums">
                            {tier.fee === 0 ? "無料" : `${tier.fee.toLocaleString()}円`}
                          </span>
                          {tier.note && (
                            <span className="w-full text-xs font-normal text-gray-500">
                              {tier.note}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {event.feeNote && (
                      <p className="text-xs font-normal text-gray-600">
                        すべての区画に {event.feeNote}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="text-base">
                      {formatFee(
                        event.feeTiers[0]?.fee ?? event.exhibitFee,
                        event.feeNote,
                        event.exhibitFeeMax
                      )}
                    </span>
                    {event.feeTiers[0]?.note && (
                      <span className="block text-xs font-normal text-gray-600 mt-0.5">
                        {event.feeTiers[0].note}
                      </span>
                    )}
                    {event.exhibitFeeMax !== null && event.exhibitFeeMax > event.exhibitFee && (
                      <span className="block text-xs font-normal text-gray-600 mt-0.5">
                        区画・エリアによって金額が変わります
                      </span>
                    )}
                  </>
                )}
              </Row>
              {event.slots !== null && (
                <Row icon={<Users className="h-5 w-5" />} label="募集枠">
                  {event.slots}台
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    応募 {event._count.applications}件
                  </span>
                </Row>
              )}
              {(event.spaceWidthM || event.spaceDepthM) && (
                <Row icon={<Ruler className="h-5 w-5" />} label="1区画のサイズ">
                  間口 {event.spaceWidthM ?? "—"}m × 奥行 {event.spaceDepthM ?? "—"}m
                </Row>
              )}
              <Row icon={<Zap className="h-5 w-5" />} label="電源">
                {event.powerAvailable
                  ? event.powerWatt
                    ? `あり（1区画 ${event.powerWatt.toLocaleString()}Wまで）`
                    : "あり"
                  : "なし（発電機をご用意ください）"}
              </Row>
              <Row icon={<Droplets className="h-5 w-5" />} label="給排水">
                {event.waterAvailable ? "あり" : "なし"}
              </Row>
              <Row icon={<Flame className="h-5 w-5" />} label="火気の使用">
                {event.fireAllowed ? "可能" : "不可"}
              </Row>
              {event.expectedVisitors !== null && (
                <Row icon={<Users className="h-5 w-5" />} label="想定来場者数">
                  {event.expectedVisitors.toLocaleString()}人
                </Row>
              )}
              {(event.applicationOpenAt || event.applicationCloseAt) && (
                <Row icon={<Clock className="h-5 w-5" />} label="募集期間">
                  {formatDateShort(event.applicationOpenAt) ?? "—"} 〜{" "}
                  {formatDateShort(event.applicationCloseAt) ?? "—"}
                </Row>
              )}
            </div>
          </section>

          {event.description && (
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-4">
              <h2 className="mb-3 font-bold text-gray-900">イベントについて</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {event.description}
              </p>
            </section>
          )}

          {requiredDocuments.length > 0 && (
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-4">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <FileText className="h-5 w-5 text-orange-500" />
                確認したい書類
              </h2>
              <div className="flex flex-wrap gap-2">
                {requiredDocuments.map((d) => (
                  <Badge key={d} variant="outline">
                    {documentTypeLabel(d)}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                応募の時点では提出不要です。主催者とのやり取りの中で、必要に応じて開示します。
              </p>
            </section>
          )}

          {event.note && (
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-4">
              <h2 className="mb-3 font-bold text-gray-900">出店者への連絡事項</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {event.note}
              </p>
            </section>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 mb-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
              <Building2 className="h-5 w-5 text-orange-500" />
              主催者
            </h2>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-medium text-gray-900">{event.organizer.orgName}</p>
              <OrganizerFollowButton
                organizerId={event.organizer.id}
                initialFollowing={!!myFollow}
                initialCount={followerCount}
                isSelf={isOwner}
              />
            </div>
            {event.organizer.intro && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {event.organizer.intro}
              </p>
            )}
            {event.organizer.website && (
              <a
                href={event.organizer.website}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300"
              >
                <Globe className="h-3.5 w-3.5" />
                主催者のサイト
              </a>
            )}

            {otherOpenEvents.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs text-gray-500">この主催者の他の募集</p>
                <ul className="space-y-1.5">
                  {otherOpenEvents.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/events/${e.id}`}
                        className="flex flex-wrap items-baseline gap-x-2 text-sm text-gray-900 hover:underline"
                      >
                        <span className="min-w-0 flex-1 truncate">{e.title}</span>
                        <span className="text-xs text-gray-500">
                          {e.area} ・ {formatDateShort(e.startAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs text-gray-500">これまでの開催</p>
                <ul className="space-y-1.5">
                  {pastEvents.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-baseline gap-x-2 text-sm text-gray-700"
                    >
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      <span className="text-xs text-gray-500">
                        {e.area} ・ {formatDateShort(e.startAt)} ・ 出店{e._count.applications}件
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* 応募 */}
          <div className="sticky bottom-4">
            <div className="rounded-2xl bg-white p-4 shadow-md">
              {myApplication ? (
                <>
                  <p className="mb-3 text-center text-sm text-gray-700">
                    <CheckCircle2 className="mr-1 inline h-4 w-4 align-[-3px] text-green-600" />
                    {myApplication.store.name}で応募済みです
                  </p>
                  <Button size="lg" variant="outline" className="w-full rounded-full" asChild>
                    <Link href={`/events/applications/${myApplication.id}`}>やり取りを見る</Link>
                  </Button>
                </>
              ) : isOwner ? (
                <div className="space-y-2">
                  <Button size="lg" variant="outline" className="w-full rounded-full" asChild>
                    <Link href={`/events/${event.id}/applications`}>応募を確認する</Link>
                  </Button>
                  {/* 応募を待つだけでは枠が埋まらない募集があるので、
                      主催者から声をかける導線も同じ場所に置く（2026-08-27 MTG）。 */}
                  {event.status === "published" && (
                    <Button size="lg" className="w-full rounded-full" asChild>
                      <Link href={`/events/${event.id}/scout`}>出店者をスカウトする</Link>
                    </Button>
                  )}
                </div>
              ) : accepting ? (
                <>
                  <Button size="lg" className="w-full rounded-full" asChild>
                    <Link href={`/events/${event.id}/apply`}>この募集に応募する</Link>
                  </Button>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    応募しても書類は届きません。やり取りのうえで開示されます。
                  </p>
                  {/* 迷っている間に締切を過ぎるのを防ぐ。応募済みの人には出さない。 */}
                  <div className="mt-3">
                    <EventFavoriteButton
                      eventId={event.id}
                      initialFavorited={!!myFavorite}
                      hasDeadline={!!event.applicationCloseAt}
                    />
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-gray-500 py-2">
                  {reason ?? "現在は応募を受け付けていません"}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
