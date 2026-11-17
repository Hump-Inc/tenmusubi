import Link from "next/link";
import { ArrowRight, CalendarDays, SlidersHorizontal } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { boshuPath, countByPrefecture } from "@/lib/boshu";
import { CALENDAR_AREA } from "@/lib/eventListing";

/** /boshu と /boshu/[pref] の共通の画面 */
export function BoshuView({
  prefecture,
  events,
  allEvents,
}: {
  prefecture: string | null;
  events: EventCardData[];
  /** 都道府県の切り替えに件数を出すための全国の募集 */
  allEvents: EventCardData[];
}) {
  const place = prefecture ?? "全国";
  const prefectures = countByPrefecture(allEvents);
  // 募集が0件の県のページでも、いまどこを見ているかがわかるように並べる
  if (prefecture && !prefectures.some((p) => p.prefecture === prefecture)) {
    prefectures.push({ prefecture, count: 0 });
  }
  const showCalendar = prefecture === CALENDAR_AREA;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {prefecture && (
            <nav className="mb-3 text-sm text-gray-500">
              <Link href="/boshu" className="hover:underline">
                出店募集一覧
              </Link>
              <span className="mx-1.5">›</span>
              {prefecture}
            </nav>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {prefecture ? `${prefecture}の` : ""}キッチンカー・出店者募集一覧
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">
            {place}のマルシェやイベントで、キッチンカー・飲食・ハンドメイドなどの出店者を募集している一覧です。
            てんむすびでは募集ページから応募でき、出店が決まったあとのやり取りや出店料の支払いまでオンラインで進められます。
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/boshu"
              className={chip(!prefecture)}
            >
              全国 {allEvents.length}件
            </Link>
            {prefectures.map((p) => (
              <Link key={p.prefecture} href={boshuPath(p.prefecture)} className={chip(prefecture === p.prefecture)}>
                {p.prefecture} {p.count}件
              </Link>
            ))}
            <Link
              href={`/search?type=event${prefecture ? `&area=${encodeURIComponent(prefecture)}` : ""}`}
              className="ml-auto inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              業種・月・出店料で絞り込む
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center text-sm leading-relaxed text-gray-600 shadow-sm">
              {place}で受け付け中の出店募集は、いまはありません。
              <br />
              新しい募集は主催者が公開しだい、ここに並びます。
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          {showCalendar && (
            <Link
              href="/calendar"
              className="mt-8 flex items-center gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm transition hover:shadow-md"
            >
              <CalendarDays className="h-5 w-5 shrink-0 text-orange-600" />
              <span className="flex-1 text-gray-700">
                千葉で開かれるマルシェ・キッチンカーイベントは、開催カレンダーにまとめています。
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
            </Link>
          )}

          <section className="mt-10 rounded-2xl bg-orange-50 p-6">
            <h2 className="font-bold text-gray-900">出店者を募集したい主催者の方へ</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              てんむすびでは、募集の公開から応募・書類の確認、出店料の受け取りまでを一つの画面で進められます。
            </p>
            <Link
              href="/guide/organizers"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:underline"
            >
              出店募集の作り方を見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function chip(active: boolean): string {
  return `rounded-full border px-3 py-1 text-sm ${
    active
      ? "border-orange-500 bg-orange-50 font-medium text-orange-700"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  }`;
}
