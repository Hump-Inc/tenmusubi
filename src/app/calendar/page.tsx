import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { isAcceptingApplications } from "@/lib/eventFormat";
import {
  CALENDAR_AREA,
  CALENDAR_PERIOD_LABELS,
  CHIBA_CITIES,
  type CalendarPeriod,
  calendarRange,
  cityFromAddress,
  formatMonthDay,
  formatTimeRange,
  jstDateKey,
  listingThumbnailPath,
  parseCalendarPeriod,
} from "@/lib/eventListing";
import { CityFilter } from "./CityFilter";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string; city?: string }>;

// 一覧にない値は無視する（URL に書かれた文字をそのまま題名に出さない）
function parseCity(value: string | undefined): string | null {
  return value && (CHIBA_CITIES as readonly string[]).includes(value) ? value : null;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { period: p, city: cityParam } = await searchParams;
  const period = parseCalendarPeriod(p);
  const city = parseCity(cityParam);
  const place = city || "千葉";
  const when = period === "upcoming" ? "" : CALENDAR_PERIOD_LABELS[period];
  const title = `${place}の${when}イベント・マルシェ・キッチンカー開催カレンダー`;
  return {
    title,
    description: `${place}で開かれるマルシェ・キッチンカーイベント・ファーマーズマーケットを開催日順に並べています。出店者の募集中のイベントもわかります。`,
    // 期間の絞り込みは日ごとに中身が変わるので、検索結果では市町村ごとのページにまとめる
    alternates: { canonical: city ? `/calendar?city=${encodeURIComponent(city)}` : "/calendar" },
  };
}

interface CalendarItem {
  key: string;
  href: string;
  title: string;
  startAt: Date;
  endAt: Date;
  city: string | null;
  venueName: string;
  image: string;
  kind: "recruiting" | "recruitClosed" | "listing";
}

const PERIODS: CalendarPeriod[] = ["upcoming", "weekend", "nextweek", "month"];

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { period: p, city: cityParam } = await searchParams;
  const period = parseCalendarPeriod(p);
  const city = parseCity(cityParam);
  const { from, to } = calendarRange(period);

  // 開催中のものも出すため「終了が from 以降・開始が to より前」で取る
  const range = { endAt: { gte: from }, startAt: { lt: to } };
  const [listings, events] = await Promise.all([
    prisma.eventListing.findMany({
      where: { ...range, status: "published", area: CALENDAR_AREA, ...(city ? { city } : {}) },
      orderBy: { startAt: "asc" },
      take: 300,
    }),
    prisma.event.findMany({
      where: { ...range, status: { in: ["published", "closed"] }, area: CALENDAR_AREA },
      orderBy: { startAt: "asc" },
      take: 300,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        venueName: true,
        address: true,
        status: true,
        images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
        applicationOpenAt: true,
        applicationCloseAt: true,
      },
    }),
  ]);

  const items: CalendarItem[] = [
    ...listings.map((l) => ({
      key: `l-${l.id}`,
      href: `/listings/${l.id}`,
      title: l.title,
      startAt: l.startAt,
      endAt: l.endAt,
      city: l.city,
      venueName: l.venueName,
      image: listingThumbnailPath(l),
      kind: "listing" as const,
    })),
    ...events
      .map((e) => ({
        key: `e-${e.id}`,
        href: `/events/${e.id}`,
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        city: cityFromAddress(e.address) ?? cityFromAddress(e.venueName),
        venueName: e.venueName,
        image: e.images[0]?.url ?? "/images/card-placeholder.svg",
        kind: isAcceptingApplications(e).accepting ? ("recruiting" as const) : ("recruitClosed" as const),
      }))
      .filter((e) => !city || e.city === city),
  ].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  // 日ごとにまとめる。開催中（始まりが from より前）のものは from の日に入れる
  const groups = new Map<string, { label: string; items: CalendarItem[] }>();
  for (const item of items) {
    const day = item.startAt < from ? from : item.startAt;
    const key = jstDateKey(day);
    if (!groups.has(key)) groups.set(key, { label: formatMonthDay(day), items: [] });
    groups.get(key)!.items.push(item);
  }

  const periodHref = (target: CalendarPeriod) => {
    const params = new URLSearchParams();
    if (target !== "upcoming") params.set("period", target);
    if (city) params.set("city", city);
    const q = params.toString();
    return q ? `/calendar?${q}` : "/calendar";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {city ?? "千葉"}のマルシェ・キッチンカー 開催カレンダー
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {city ?? "千葉県内"}で開かれるイベントを、開催日の順に並べています。
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {PERIODS.map((target) => (
              <Link
                key={target}
                href={periodHref(target)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  period === target
                    ? "border-orange-500 bg-orange-50 font-medium text-orange-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {CALENDAR_PERIOD_LABELS[target]}
              </Link>
            ))}
            <CityFilter period={period} city={city} />
          </div>

          {groups.size === 0 ? (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
              この期間に載っているイベントはまだありません。
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {[...groups.entries()].map(([key, group]) => (
                <section key={key}>
                  <h2 className="mb-2 border-b border-gray-200 pb-1 text-sm font-bold text-gray-900">
                    {group.label}
                  </h2>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition hover:shadow-md"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt=""
                            width={120}
                            height={63}
                            loading="lazy"
                            className="h-[50px] w-[96px] shrink-0 rounded-lg bg-orange-50 object-cover sm:h-[63px] sm:w-[120px]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{item.title}</p>
                            <p className="mt-0.5 text-xs text-gray-600">
                              {formatTimeRange(item.startAt, item.endAt)}
                              {item.city && `・${item.city}`}・{item.venueName}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                              item.kind === "recruiting"
                                ? "bg-orange-100 font-medium text-orange-700"
                                : "border border-gray-200 text-gray-500"
                            }`}
                          >
                            {item.kind === "recruiting"
                              ? "出店募集中"
                              : item.kind === "recruitClosed"
                                ? "出店募集"
                                : "運営が掲載"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className="mt-10 rounded-2xl bg-orange-50 p-5 text-sm text-gray-700">
            <p className="font-bold text-gray-900">イベントの主催者の方へ</p>
            <p className="mt-1">
              てんむすびで出店者を募集すると、このカレンダーに「出店募集中」として載ります。
              掲載内容の修正・取り下げのご依頼は<Link href="/contact" className="underline">お問い合わせ</Link>からどうぞ。
            </p>
            <Link href="/for/organizers" className="mt-2 inline-block font-medium text-orange-700 underline">
              出店者を募集する
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
